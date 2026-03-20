const express = require('express');
const OpenAI = require('openai');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT =
  "You are BetrFood's AI cooking assistant. You help users with food-related questions including recipes, cooking techniques, ingredient substitutions, meal planning, nutrition information, and food storage tips. Be friendly, concise, and helpful. If asked about non-food topics, gently redirect to food-related assistance.";

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

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
