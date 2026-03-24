const express = require('express');
const OpenAI = require('openai');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const openai = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  : null;

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
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (pantryError) {
      console.error('[CHAT] Pantry query failed:', pantryError.message);
    }
    console.log('[CHAT] Pantry items for', userId, ':', pantryItems?.length ?? 0);

    if (!pantryItems || pantryItems.length === 0) {
      return `${BASE_SYSTEM_PROMPT}\n\nThe user's pantry is currently empty. If they ask about cooking or recipes, let them know their pantry is empty and suggest they add items to their pantry first. You can still answer general food questions.${isPantryQuery ? RECIPE_FORMAT_INSTRUCTIONS : ''}`;
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
  } catch (err) {
    console.error('[CHAT] buildSystemPrompt error:', err.message);
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

  if (!openai) {
    return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
  }

  try {
    // Save user message
    await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'user', content: message.trim() });

    // Fetch last 20 messages for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationMessages = (history || []).reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if pantry query with empty pantry — respond directly without AI
    const isPantryQuery = hasPantryIntent(message.trim());
    if (isPantryQuery) {
      const { data: pantryCheck } = await supabase
        .from('pantry_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!pantryCheck || pantryCheck.length === 0) {
        const emptyMsg = "Your pantry is currently empty! Head over to the **Pantry** tab to add ingredients, and then I can suggest recipes based on what you have.";
        const { data: saved } = await supabase
          .from('chat_messages')
          .insert({ user_id: userId, role: 'assistant', content: emptyMsg })
          .select('id, role, content, created_at')
          .single();
        return res.json(saved);
      }
    }

    const systemPrompt = await buildSystemPrompt(userId, isPantryQuery);

    // Call OpenRouter API
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationMessages,
      ],
    });

    const assistantContent = response.choices[0].message.content;

    // Save assistant response
    const { data: saved } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'assistant', content: assistantContent })
      .select('id, role, content, created_at')
      .single();

    res.json(saved);
  } catch (err) {
    console.error('[CHAT ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to get AI response', details: err.message });
  }
});

// GET /api/chat/pantry-suggestions — generate recipe suggestions from current pantry
router.get('/pantry-suggestions', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  if (!openai) {
    return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
  }

  try {
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (!pantryItems || pantryItems.length === 0) {
      const emptyMsg = "Your pantry is currently empty! Head over to the **Pantry** tab to add ingredients, and then I can suggest recipes based on what you have.";
      await supabase
        .from('chat_messages')
        .insert({ user_id: userId, role: 'user', content: 'What can I cook with the items in my pantry?' });
      const { data: saved } = await supabase
        .from('chat_messages')
        .insert({ user_id: userId, role: 'assistant', content: emptyMsg })
        .select('id, role, content, created_at')
        .single();
      return res.json({ ...saved, pantryCount: 0 });
    }

    const systemPrompt = await buildSystemPrompt(userId, true);

    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
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

    // Save exchange to chat history
    await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'user', content: 'What can I cook with the items in my pantry?' });

    const { data: saved } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'assistant', content: suggestions })
      .select('id, role, content, created_at')
      .single();

    res.json({ ...saved, pantryCount: pantryItems.length });
  } catch (err) {
    console.error('[PANTRY SUGGESTIONS ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to get pantry suggestions', details: err.message });
  }
});

// GET /api/chat/history — get conversation history
router.get('/history', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (err) {
    console.error('[CHAT HISTORY ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch chat history', details: err.message });
  }
});

module.exports = router;
