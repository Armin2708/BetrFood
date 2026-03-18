const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────
function getUserId(req) {
  return req.userId || (req.user && req.user.id) || req.headers['x-user-id'] || 'anonymous';
}

// ─── routes ────────────────────────────────────────────────────────────────

// GET /api/pantry
router.get('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// GET /api/pantry/:id
router.get('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single();

  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/pantry
router.post('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { name, quantity, unit, category, expirationDate } = req.body;
  if (!name || typeof quantity !== 'number') return res.status(400).json({ error: 'name + numeric quantity required' });

  const payload = {
    user_id: userId,
    name,
    quantity,
    unit: unit || '',
    category: category || 'Other',
    expiration_date: expirationDate || null
  };

  const { data, error } = await supabase.from('pantry_items').insert(payload).single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/pantry/:id
router.put('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single();

  if (error) return res.status(404).json({ error: 'Not found or no permission' });
  res.json(data);
});

// DELETE /api/pantry/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) return res.status(404).json({ error: 'Not found or no permission' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
