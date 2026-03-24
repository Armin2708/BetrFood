const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/posts/:postId/comments - List comments for a post (paginated, with user profiles)
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich with user profile data
    const enriched = await enrichCommentsWithProfiles(comments || []);
    const mapped = enriched.map(mapComment);

    // Build threaded tree: nest replies under their parent
    const commentMap = {};
    const roots = [];
    for (const c of mapped) {
      c.replies = [];
      commentMap[c.id] = c;
    }
    for (const c of mapped) {
      if (c.parentId && commentMap[c.parentId]) {
        commentMap[c.parentId].replies.push(c);
      } else {
        roots.push(c);
      }
    }

    // Get total count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.json({ comments: roots, total: count || 0 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// GET /api/posts/:postId/comments/count - Get comment count for a post
router.get('/:postId/comments/count', async (req, res) => {
  try {
    const { postId } = req.params;

    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching comment count:', error);
    res.status(500).json({ error: 'Failed to fetch comment count.' });
  }
});

// POST /api/posts/:postId/comments - Create a comment (auth required)
router.post('/:postId/comments', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less.' });
    }

    // Verify the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // If parentId is provided, verify the parent comment exists and belongs to the same post
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, post_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({ error: 'Parent comment not found.' });
      }

      if (parentComment.post_id !== postId) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post.' });
      }
    }

    const now = new Date().toISOString();

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: req.userId,
        content: content.trim(),
        parent_id: parentId || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    const [enriched] = await enrichCommentsWithProfiles([comment]);
    res.status(201).json(mapComment(enriched));
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment.' });
  }
});

// DELETE /api/comments/:commentId - Delete own comment (auth required, owner only)
router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (comment.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    res.json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

// Enrich comments with user profile data
async function enrichCommentsWithProfiles(comments) {
  if (!comments || comments.length === 0) return comments;

  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, verified')
    .in('id', userIds);

  const profileMap = {};
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.id] = p;
    }
  }

  return comments.map(comment => {
    comment._profile = profileMap[comment.user_id] || null;
    return comment;
  });
}

// Map to camelCase for frontend
function mapComment(comment) {
  const profile = comment._profile || {};
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    content: comment.content,
    parentId: comment.parent_id || null,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    displayName: profile.display_name || null,
    username: profile.username || null,
    avatarUrl: profile.avatar_url || null,
    verified: profile.verified || false,
  };
}

module.exports = router;
