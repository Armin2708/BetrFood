const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// Helper: get or create the default "Saved" collection for a user
async function getOrCreateSavedCollection(userId) {
  const { data: existing, error: fetchError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'Saved')
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('collections')
    .insert({ user_id: userId, name: 'Saved' })
    .select()
    .single();

  if (createError) throw createError;

  return created;
}

// POST /api/posts/:postId/save - Quick save to default "Saved" collection
router.post('/:postId/save', requireAuth, async (req, res) => {
  try {
    const collection = await getOrCreateSavedCollection(req.userId);

    const { error } = await supabase
      .from('collection_posts')
      .insert({
        collection_id: collection.id,
        post_id: req.params.postId,
      });

    if (error) {
      if (error.code === '23505') {
        return res.json({ message: 'Post already saved.' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Post saved successfully.' });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post.' });
  }
});

// DELETE /api/posts/:postId/save - Remove from saved
router.delete('/:postId/save', requireAuth, async (req, res) => {
  try {
    const collection = await getOrCreateSavedCollection(req.userId);

    const { error } = await supabase
      .from('collection_posts')
      .delete()
      .eq('collection_id', collection.id)
      .eq('post_id', req.params.postId);

    if (error) throw error;

    res.json({ message: 'Post unsaved successfully.' });
  } catch (error) {
    console.error('Error unsaving post:', error);
    res.status(500).json({ error: 'Failed to unsave post.' });
  }
});

// GET /api/posts/:postId/save-status - Check if post is saved (auth required)
router.get('/:postId/save-status', requireAuth, async (req, res) => {
  try {
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', req.userId)
      .eq('name', 'Saved')
      .maybeSingle();

    if (!collection) {
      return res.json({ isSaved: false });
    }

    const { data, error } = await supabase
      .from('collection_posts')
      .select('id')
      .eq('collection_id', collection.id)
      .eq('post_id', req.params.postId)
      .maybeSingle();

    if (error) throw error;

    res.json({ isSaved: !!data });
  } catch (error) {
    console.error('Error checking save status:', error);
    res.status(500).json({ error: 'Failed to check save status.' });
  }
});

module.exports = router;
