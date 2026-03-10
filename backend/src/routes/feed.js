const express = require('express');
const supabase = require('../db/supabase');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Cuisine tag name → preference key mapping
const CUISINE_TAG_MAP = {
  'Italian': 'Italian', 'Japanese': 'Japanese', 'Mexican': 'Mexican',
  'Indian': 'Indian', 'Thai': 'Thai', 'Chinese': 'Chinese',
  'French': 'French', 'American': 'American', 'Mediterranean': 'Mediterranean',
  'Korean': 'Korean',
};

const COOK_TIME_MAP = {
  'under_30': 30, '30_to_60': 60, '1_to_2_hours': 120, 'over_2_hours': Infinity,
};

async function getUserPreferences(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single();
  if (!data?.preferences) return null;
  const p = data.preferences;
  if (!p.cuisines?.length && !p.cookTime && !p.skillLevel) return null;
  return p;
}

async function getFollowedUserIds(userId) {
  if (!userId) return new Set();
  const { data } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  return new Set((data || []).map(r => r.following_id));
}

function scorePost(post, postTags, preferences, followedIds, now) {
  let score = 0;

  // Recency decay — score up to 100 over 7 days
  const ageHours = (now - new Date(post.created_at).getTime()) / 36e5;
  score += Math.max(0, 100 - (ageHours / 168) * 100);

  // Follow boost
  if (followedIds.has(post.user_id)) score += 50;

  if (preferences) {
    // Cuisine tag boost
    if (preferences.cuisines?.length > 0) {
      let cuisineBoost = 0;
      for (const tag of postTags) {
        if (CUISINE_TAG_MAP[tag.name] && preferences.cuisines.includes(CUISINE_TAG_MAP[tag.name])) {
          cuisineBoost += 20;
        }
      }
      score += Math.min(cuisineBoost, 40);
    }

    // Cook time boost
    if (preferences.cookTime && post.recipe_cook_time != null) {
      const maxMinutes = COOK_TIME_MAP[preferences.cookTime];
      if (post.recipe_cook_time <= maxMinutes) score += 15;
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// GET /api/feed?userId=xxx&mode=for_you|following&cursor=xxx&limit=10&tags=1,2
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || null;
    const mode = req.query.mode === 'following' ? 'following' : 'for_you';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = req.query.cursor || null;
    const tagIds = req.query.tags
      ? req.query.tags.split(',').map(Number).filter(Boolean)
      : [];

    // ── Following mode: simple chronological feed of followed users ──────────
    if (mode === 'following') {
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.size === 0) return res.json({ posts: [], nextCursor: null, hasMore: false });

      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_draft', false)
        .in('user_id', [...followedIds])
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

      return res.json({ posts: await enrichPosts(page), nextCursor, hasMore });
    }

    // ── For You mode: scored + ranked ────────────────────────────────────────
    const [preferences, followedIds] = await Promise.all([
      getUserPreferences(userId),
      getFollowedUserIds(userId),
    ]);

    // Fetch a larger pool to rank from
    const poolSize = limit * 5;
    let query = supabase
      .from('posts')
      .select('*')
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(poolSize);

    if (cursor) {
      const { data: cp } = await supabase.from('posts').select('created_at').eq('id', cursor).single();
      if (cp) query = query.lt('created_at', cp.created_at);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    if (!posts || posts.length === 0) return res.json({ posts: [], nextCursor: null, hasMore: false });

    // Fetch tags for all posts in pool
    const postIds = posts.map(p => p.id);
    const { data: allPostTags } = await supabase
      .from('post_tags')
      .select('post_id, tags(id, name, type)')
      .in('post_id', postIds);

    // Build tag filter set
    let tagFilterSet = new Set(tagIds);

    // Group tags by post
    const tagsByPost = {};
    for (const pt of (allPostTags || [])) {
      if (!tagsByPost[pt.post_id]) tagsByPost[pt.post_id] = [];
      tagsByPost[pt.post_id].push(pt.tags);
    }

    const now = Date.now();

    // Score and filter
    let scored = posts
      .filter(post => {
        if (tagFilterSet.size === 0) return true;
        const postTagIds = new Set((tagsByPost[post.id] || []).map(t => t.id));
        return [...tagFilterSet].every(id => postTagIds.has(id));
      })
      .map(post => ({
        post,
        score: scorePost(post, tagsByPost[post.id] || [], preferences, followedIds, now),
      }))
      .sort((a, b) => b.score - a.score);

    const hasMore = scored.length > limit;
    const page = scored.slice(0, limit).map(s => s.post);
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const enriched = await enrichPosts(page, tagsByPost);
    res.json({ posts: enriched, nextCursor, hasMore });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed.' });
  }
});

// Enrich posts with tags (and recipe cook time if needed)
async function enrichPosts(posts, preloadedTags = null) {
  if (posts.length === 0) return [];

  let tagsByPost = preloadedTags;
  if (!tagsByPost) {
    const postIds = posts.map(p => p.id);
    const { data: allPostTags } = await supabase
      .from('post_tags')
      .select('post_id, tags(id, name, type)')
      .in('post_id', postIds);
    tagsByPost = {};
    for (const pt of (allPostTags || [])) {
      if (!tagsByPost[pt.post_id]) tagsByPost[pt.post_id] = [];
      tagsByPost[pt.post_id].push(pt.tags);
    }
  }

  return posts.map(post => ({
    ...mapPost(post),
    tags: tagsByPost[post.id] || [],
  }));
}

function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    imagePath: post.image_path,
    imagePaths: post.image_paths || [],
    videoPath: post.video_path || null,
    videoType: post.video_type || null,
    isDraft: post.is_draft || false,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    editedAt: post.edited_at || null,
  };
}

module.exports = router;
