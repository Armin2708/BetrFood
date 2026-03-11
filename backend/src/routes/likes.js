const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /posts/:id/like
router.post('/:id/like', async (req, res) => {
  const { id } = req.params;
  const userId = req.auth.userId; // from Clerk middleware

  await supabase.from('likes').insert({ post_id: id, user_id: userId });

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id);

  res.json({ likes: count });
});

// DELETE /posts/:id/like
router.delete('/:id/like', async (req, res) => {
  const { id } = req.params;
  const userId = req.auth.userId;

  await supabase.from('likes').delete()
    .eq('post_id', id)
    .eq('user_id', userId);

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id);

  res.json({ likes: count });
});

module.exports = router;