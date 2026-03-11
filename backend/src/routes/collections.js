const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/collections - Create named collection (auth required)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: req.userId,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      userId: data.user_id,
      name: data.name,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection.' });
  }
});

// GET /api/collections - List user's collections (auth required)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(
      (data || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        createdAt: c.created_at,
      }))
    );
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: 'Failed to list collections.' });
  }
});

// DELETE /api/collections/:id - Delete collection (auth required, owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !collection) {
      return res.status(404).json({ error: 'Collection not found.' });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this collection.' });
    }

    // Delete associated collection_posts first
    await supabase
      .from('collection_posts')
      .delete()
      .eq('collection_id', req.params.id);

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Collection deleted successfully.' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection.' });
  }
});

// POST /api/collections/:id/posts - Add post to collection (auth required)
router.post('/:id/posts', requireAuth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ error: 'postId is required.' });
    }

    // Verify ownership of collection
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !collection) {
      return res.status(404).json({ error: 'Collection not found.' });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this collection.' });
    }

    const { data, error } = await supabase
      .from('collection_posts')
      .insert({
        collection_id: req.params.id,
        post_id: postId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Post already in this collection.' });
      }
      throw error;
    }

    res.status(201).json({
      id: data.id,
      collectionId: data.collection_id,
      postId: data.post_id,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Error adding post to collection:', error);
    res.status(500).json({ error: 'Failed to add post to collection.' });
  }
});

// DELETE /api/collections/:id/posts/:postId - Remove post from collection (auth required)
router.delete('/:id/posts/:postId', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !collection) {
      return res.status(404).json({ error: 'Collection not found.' });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this collection.' });
    }

    const { error } = await supabase
      .from('collection_posts')
      .delete()
      .eq('collection_id', req.params.id)
      .eq('post_id', req.params.postId);

    if (error) throw error;

    res.json({ message: 'Post removed from collection.' });
  } catch (error) {
    console.error('Error removing post from collection:', error);
    res.status(500).json({ error: 'Failed to remove post from collection.' });
  }
});

// GET /api/collections/:id/posts - List posts in a collection (auth required)
router.get('/:id/posts', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !collection) {
      return res.status(404).json({ error: 'Collection not found.' });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view this collection.' });
    }

    const { data: collectionPosts, error } = await supabase
      .from('collection_posts')
      .select('post_id, created_at')
      .eq('collection_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!collectionPosts || collectionPosts.length === 0) {
      return res.json([]);
    }

    const postIds = collectionPosts.map(cp => cp.post_id);
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);

    if (postsError) throw postsError;

    res.json(
      (posts || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        caption: p.caption,
        imagePath: p.image_path,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }))
    );
  } catch (error) {
    console.error('Error listing collection posts:', error);
    res.status(500).json({ error: 'Failed to list collection posts.' });
  }
});

module.exports = router;
