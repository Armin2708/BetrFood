const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureProfile(userId) {
  const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
  if (data) return data;
  const { data: created } = await supabase
    .from('user_profiles')
    .insert({ id: userId, username: userId, display_name: userId, preferences: {} })
    .select()
    .single();
  return created;
}

function mapProfile(profile, stats = {}) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl: profile.avatar_url,
    isPrivate: profile.is_private || false,
    role: profile.role || 'user',
    preferences: profile.preferences || {},
    postCount: stats.postCount ?? 0,
    followerCount: stats.followerCount ?? 0,
    followingCount: stats.followingCount ?? 0,
  };
}

async function getStats(userId) {
  const [{ count: postCount }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_draft', false),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { postCount: postCount || 0, followerCount: followerCount || 0, followingCount: followingCount || 0 };
}

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const profile = await ensureProfile(req.params.id);
    const stats = await getStats(req.params.id);
    res.json(mapProfile(profile, stats));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.userId !== req.params.id) return res.status(403).json({ error: 'Not authorized.' });

    await ensureProfile(req.params.id);
    const { username, displayName, bio, avatarUrl, isPrivate } = req.body;

    if (username) {
      const { data: conflict } = await supabase
        .from('user_profiles').select('id').eq('username', username).neq('id', req.params.id).single();
      if (conflict) return res.status(409).json({ error: 'Username already taken.' });
    }

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (displayName !== undefined) updates.display_name = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (isPrivate !== undefined) updates.is_private = isPrivate;

    const { data: updated, error } = await supabase
      .from('user_profiles').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    const stats = await getStats(req.params.id);
    res.json(mapProfile(updated, stats));
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ── GET /api/users/:id/preferences ───────────────────────────────────────────
router.get('/:id/preferences', async (req, res) => {
  try {
    const profile = await ensureProfile(req.params.id);
    res.json(profile.preferences || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// ── PUT /api/users/:id/preferences ───────────────────────────────────────────
router.put('/:id/preferences', requireAuth, async (req, res) => {
  try {
    if (req.userId !== req.params.id) return res.status(403).json({ error: 'Not authorized.' });

    await ensureProfile(req.params.id);
    const { cuisines, skillLevel, cookTime, equipment } = req.body;
    const preferences = {
      cuisines: Array.isArray(cuisines) ? cuisines : [],
      skillLevel: skillLevel || null,
      cookTime: cookTime || null,
      equipment: Array.isArray(equipment) ? equipment : [],
    };

    const { error } = await supabase
      .from('user_profiles').update({ preferences }).eq('id', req.params.id);
    if (error) throw error;

    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// ── GET /api/users/:id/posts ──────────────────────────────────────────────────
router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const profile = await ensureProfile(req.params.id);
    const requesterId = req.userId || req.query.requesterId;
    const isOwnProfile = requesterId === req.params.id;

    if (profile.is_private && !isOwnProfile) {
      const { data: follow } = await supabase
        .from('user_follows').select('follower_id')
        .eq('follower_id', requesterId).eq('following_id', req.params.id).single();
      if (!follow) return res.json({ posts: [], nextCursor: null, hasMore: false, restricted: true });
    }

    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const cursor = req.query.cursor || null;

    let query = supabase
      .from('posts').select('*')
      .eq('user_id', req.params.id)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cp } = await supabase.from('posts').select('created_at').eq('id', cursor).single();
      if (cp) query = query.lt('created_at', cp.created_at);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    res.json({ posts: page.map(p => ({ id: p.id, userId: p.user_id, caption: p.caption, imagePath: p.image_path, imagePaths: p.image_paths || [], videoPath: p.video_path || null, createdAt: p.created_at })), nextCursor, hasMore, restricted: false });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
  }
});

// ── GET /api/users/:id/follow-status ─────────────────────────────────────────
router.get('/:id/follow-status', optionalAuth, async (req, res) => {
  try {
    const requesterId = req.userId || req.query.requesterId;
    if (!requesterId) return res.json({ isFollowing: false });
    const { data } = await supabase
      .from('user_follows').select('follower_id')
      .eq('follower_id', requesterId).eq('following_id', req.params.id).single();
    res.json({ isFollowing: !!data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check follow status.' });
  }
});

// ── POST /api/users/:id/follow ────────────────────────────────────────────────
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ error: 'Cannot follow yourself.' });

    const { error } = await supabase
      .from('user_follows')
      .upsert({ follower_id: req.userId, following_id: req.params.id }, { onConflict: 'follower_id,following_id' });
    if (error) throw error;

    const stats = await getStats(req.params.id);
    res.json({ isFollowing: true, followerCount: stats.followerCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user.' });
  }
});

// ── DELETE /api/users/:id/follow ──────────────────────────────────────────────
router.delete('/:id/follow', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', req.userId)
      .eq('following_id', req.params.id);
    if (error) throw error;

    const stats = await getStats(req.params.id);
    res.json({ isFollowing: false, followerCount: stats.followerCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user.' });
  }
});

module.exports = router;
