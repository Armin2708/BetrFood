const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// ── GET /api/tags ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('tags').select('*').order('type').order('name');
    if (req.query.type) query = query.eq('type', req.query.type);
    const { data: tags, error } = await query;
    if (error) throw error;
    res.json(tags || []);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

module.exports = router;
