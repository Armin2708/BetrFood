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

async function buildSystemPrompt(userId) {
  try {
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (!pantryItems || pantryItems.length === 0) {
      return BASE_SYSTEM_PROMPT;
    }

    const itemList = pantryItems
      .map((item) => {
        let entry = `- ${item.name}: ${item.quantity} ${item.unit}`;
        if (item.category) entry += ` (${item.category})`;
        if (item.expiration_date) {
          const exp = new Date(item.expiration_date);
          const now = new Date();
          if (exp < now) entry += ' [EXPIRED]';
          else {
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3) entry += ` [expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}]`;
          }
        }
        return entry;
      })
      .join('\n');

    return `${BASE_SYSTEM_PROMPT}

The user's pantry currently contains these items:
${itemList}

When suggesting recipes or meal ideas, prioritize using ingredients from the user's pantry. If a recipe requires items not in the pantry, clearly flag them as "Extra items needed." Note any pantry items that are expiring soon and suggest using them first.`;
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

    // Build system prompt with pantry context
    const systemPrompt = await buildSystemPrompt(userId);

    // Call OpenAI API
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
