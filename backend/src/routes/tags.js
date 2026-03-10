const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/tags
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabase.from('tags').select('*').order('type').order('name');
    if (type) {
      query = query.eq('type', type);
    }
    const { data: tags, error } = await query;
    if (error) throw error;
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

// GET /api/tags/posts/by-tags?tags=1,2,3
router.get('/posts/by-tags', async (req, res) => {
  try {
    const tagsParam = req.query.tags;
    if (!tagsParam) {
      return res.status(400).json({ error: 'tags query parameter is required.' });
    }

    const tagIds = tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (tagIds.length === 0) {
      return res.status(400).json({ error: 'Invalid tag IDs.' });
    }

    // Get post IDs that have ALL specified tags
    const { data: postTags, error: ptError } = await supabase
      .from('post_tags')
      .select('post_id, tag_id')
      .in('tag_id', tagIds);

    if (ptError) throw ptError;

    // Group by post_id and filter those with all tags
    const postTagCounts = {};
    for (const pt of postTags) {
      postTagCounts[pt.post_id] = (postTagCounts[pt.post_id] || new Set()).add(pt.tag_id);
    }
    const matchingPostIds = Object.entries(postTagCounts)
      .filter(([, tags]) => tags.size === tagIds.length)
      .map(([postId]) => postId);

    if (matchingPostIds.length === 0) {
      return res.json([]);
    }

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', matchingPostIds)
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    // Attach tags to each post
    const result = await Promise.all(posts.map(async (post) => {
      const tags = await getTagsForPost(post.id);
      return {
        id: post.id,
        userId: post.user_id,
        caption: post.caption,
        imagePath: post.image_path,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        editedAt: post.edited_at || null,
        tags,
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error filtering posts by tags:', error);
    res.status(500).json({ error: 'Failed to filter posts.' });
  }
});

// POST /api/tags/posts/:id/tags
router.post('/posts/:id/tags', async (req, res) => {
  const postId = req.params.id;
  const { tagIds } = req.body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return res.status(400).json({ error: 'tagIds array is required.' });
  }

  try {
    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Verify all tags exist
    const { data: existingTags, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .in('id', tagIds);

    if (tagError) throw tagError;
    if (existingTags.length !== tagIds.length) {
      return res.status(400).json({ error: 'One or more tag IDs are invalid.' });
    }

    // Insert post-tag relationships (ignore duplicates)
    const rows = tagIds.map(tagId => ({ post_id: postId, tag_id: tagId }));
    const { error: insertError } = await supabase
      .from('post_tags')
      .upsert(rows, { onConflict: 'post_id,tag_id' });

    if (insertError) throw insertError;

    const tags = await getTagsForPost(postId);
    res.json({ postId, tags });
  } catch (error) {
    console.error('Error adding tags to post:', error);
    res.status(500).json({ error: 'Failed to add tags.' });
  }
});

// DELETE /api/tags/posts/:id/tags/:tagId
router.delete('/posts/:id/tags/:tagId', async (req, res) => {
  const { id: postId, tagId } = req.params;

  try {
    const { error, count } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .eq('tag_id', parseInt(tagId));

    if (error) throw error;
    res.json({ message: 'Tag removed from post.' });
  } catch (error) {
    console.error('Error removing tag from post:', error);
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

// GET /api/tags/posts/:id/tags
router.get('/posts/:id/tags', async (req, res) => {
  try {
    const tags = await getTagsForPost(req.params.id);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching post tags:', error);
    res.status(500).json({ error: 'Failed to fetch post tags.' });
  }
});

async function getTagsForPost(postId) {
  const { data, error } = await supabase
    .from('post_tags')
    .select('tag_id, tags(id, name, type)')
    .eq('post_id', postId);

  if (error) throw error;
  return (data || []).map(row => row.tags).filter(Boolean);
}

module.exports = router;
