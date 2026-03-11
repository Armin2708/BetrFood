const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /posts/:id/like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const { error: insertError } = await supabase
      .from('likes')
      .insert({ post_id: id, user_id: userId });

    if (insertError && insertError.code !== '23505') {
      // 23505 = unique violation (already liked), ignore that
      throw insertError;
    }

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    res.json({ likes: count });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post.' });
  }
});

// DELETE /posts/:id/like
router.delete('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await supabase.from('likes').delete()
      .eq('post_id', id)
      .eq('user_id', userId);

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    res.json({ likes: count });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post.' });
  }
});

module.exports = router;
