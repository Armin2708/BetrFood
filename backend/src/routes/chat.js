const express = require('express');
const OpenAI = require('openai');
const pool = require('../db/pool');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const BASE_SYSTEM_PROMPT =
  "You are BetrFood's AI cooking assistant. You help users with food-related questions including recipes, cooking techniques, ingredient substitutions, meal planning, nutrition information, and food storage tips. Be friendly, concise, and helpful. If asked about non-food topics, gently redirect to food-related assistance.";

const RECIPE_FORMAT_INSTRUCTIONS = `
When suggesting recipes, always format each recipe as follows:

**[Recipe Name]**
[1-2 sentence description]
✅ Pantry items used: [comma-separated list]
🛒 Extra items needed: [comma-separated list, or "None" if pantry covers it]

Suggest 2-3 recipes per response unless the user asks for more or fewer. After listing recipes, offer to give detailed instructions for any of them.`;

const PANTRY_INTENT_KEYWORDS = [
  'pantry', 'what can i cook', 'what can i make', 'ingredients i have',
  'what do i have', 'use up', 'fridge', 'use what', 'leftovers',
  'cook with', 'make with', 'recipe with', 'recipe from', 'meal idea',
  'meal suggestion', 'dinner idea', 'lunch idea', 'breakfast idea',
];

function hasPantryIntent(message) {
  const lower = message.toLowerCase();
  return PANTRY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

async function buildSystemPrompt(userId, isPantryQuery = false) {
  try {
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (!pantryItems || pantryItems.length === 0) {
      const base = isPantryQuery
        ? `${BASE_SYSTEM_PROMPT}\n\nThe user's pantry is currently empty. Suggest that they add items to their pantry first, then offer some general recipe ideas based on common pantry staples.`
        : BASE_SYSTEM_PROMPT;
      return isPantryQuery ? base + RECIPE_FORMAT_INSTRUCTIONS : base;
    }

    const now = new Date();
    const itemList = pantryItems
      .map((item) => {
        let entry = `- ${item.name}: ${item.quantity} ${item.unit}`.trimEnd();
        if (item.category) entry += ` (${item.category})`;
        if (item.expiration_date) {
          const exp = new Date(item.expiration_date);
          if (exp < now) {
            entry += ' [EXPIRED]';
          } else {
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3) entry += ` [expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}]`;
          }
        }
        return entry;
      })
      .join('\n');

    const pantrySection = `
The user's pantry currently contains these items:
${itemList}

When suggesting recipes or meal ideas, prioritize using ingredients from the user's pantry. Clearly flag any ingredients a recipe needs that are NOT in the pantry as "Extra items needed." Note items expiring soon and suggest using them first.`;

    if (isPantryQuery) {
      return `${BASE_SYSTEM_PROMPT}${pantrySection}${RECIPE_FORMAT_INSTRUCTIONS}`;
    }

    return `${BASE_SYSTEM_PROMPT}${pantrySection}`;
  } catch {
    return BASE_SYSTEM_PROMPT;
  }
}

function getUserId(req) {
  return req.userId || (req.user && req.user.id) || req.headers['x-user-id'] || 'anonymous';
}

// POST /api/chat — send a message, get AI response
router.post('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Save user message
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', message.trim()]
    );

    // Fetch last 20 messages for context
    const { rows: history } = await pool.query(
      'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    // Reverse so oldest is first
    const conversationMessages = history.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build system prompt — use enriched recipe format when pantry intent detected
    const isPantryQuery = hasPantryIntent(message.trim());
    const systemPrompt = await buildSystemPrompt(userId, isPantryQuery);

    // Call OpenRouter API
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationMessages,
      ],
    });

    const assistantContent = response.choices[0].message.content;

    // Save assistant response
    const { rows } = await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
      [userId, 'assistant', assistantContent]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('[CHAT ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// GET /api/chat/pantry-suggestions — generate recipe suggestions from current pantry
router.get('/pantry-suggestions', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  try {
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (!pantryItems || pantryItems.length === 0) {
      return res.json({
        message: "Your pantry is empty! Add some items to your pantry and I'll suggest recipes you can make with them.",
        pantryCount: 0,
      });
    }

    const systemPrompt = await buildSystemPrompt(userId, true);

    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'What can I cook with the items in my pantry? Please suggest recipes based on what I have.',
        },
      ],
    });

    const suggestions = response.choices[0].message.content;

    // Save this exchange to chat history so context is maintained
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', 'What can I cook with the items in my pantry?']
    );
    const { rows } = await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
      [userId, 'assistant', suggestions]
    );

    res.json({ ...rows[0], pantryCount: pantryItems.length });
  } catch (err) {
    console.error('[PANTRY SUGGESTIONS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get pantry suggestions' });
  }
});

// GET /api/chat/history — get conversation history
router.get('/history', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  try {
    const { rows } = await pool.query(
      'SELECT id, role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50',
      [userId]
    );

    res.json({ messages: rows });
  } catch (err) {
    console.error('[CHAT HISTORY ERROR]', err.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

module.exports = router;
