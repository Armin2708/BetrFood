const express = require('express');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTagsForPost(postId) {
  try {
    return db.prepare(`
      SELECT t.* FROM tags t
      JOIN post_tags pt ON pt.tagId = t.id
      WHERE pt.postId = ?
      ORDER BY t.type, t.name
    `).all(postId);
  } catch {
    return [];
  }
}

function getFollowedUserIds(userId) {
  // TODO: replace with real follows table query
  // e.g. return new Set(db.prepare('SELECT followingId FROM follows WHERE followerId = ?').all(userId).map(r => r.followingId));
  return new Set();
}

function getLikeCounts() {
  // TODO: replace with real likes table query
  return {};
}

function getUserPreferences(userId) {
  try {
    const user = db.prepare('SELECT preferences FROM users WHERE id = ?').get(userId);
    if (!user || !user.preferences) return null;
    const prefs = JSON.parse(user.preferences);
    // Return null if preferences are effectively empty — no boost applied
    const hasPrefs =
      (prefs.cuisines && prefs.cuisines.length > 0) ||
      prefs.skillLevel ||
      prefs.cookTime ||
      (prefs.equipment && prefs.equipment.length > 0);
    return hasPrefs ? prefs : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cuisine tag → preference ID mapping
// Maps tag names (lowercase) to cuisine preference IDs from preferenceData.ts
// ---------------------------------------------------------------------------
const CUISINE_TAG_MAP = {
  'italian':        'italian',
  'mexican':        'mexican',
  'japanese':       'japanese',
  'chinese':        'chinese',
  'indian':         'indian',
  'french':         'french',
  'thai':           'thai',
  'greek':          'greek',
  'american':       'american',
  'korean':         'korean',
  'vietnamese':     'vietnamese',
  'spanish':        'spanish',
  'mediterranean':  'mediterranean',
  'middle eastern': 'middle_eastern',
  'caribbean':      'caribbean',
  'african':        'african',
};

// ---------------------------------------------------------------------------
// Cook time matching
// Maps preference cookTime IDs to max recipe cookTime in minutes
// ---------------------------------------------------------------------------
const COOK_TIME_LIMITS = {
  under_15: 15,
  under_30: 30,
  under_60: 60,
  any: Infinity,
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scorePost(post, tags, followedIds, likeCounts, prefs, now) {
  let score = 0;

  // ── Relationship boost ──────────────────────────────────────────────────
  if (followedIds.has(post.userId)) score += 30;

  // ── Tag overlap boost ───────────────────────────────────────────────────
  const tagCount = tags.length;
  if (tagCount >= 5)      score += 45;
  else if (tagCount >= 3) score += 35;
  else if (tagCount >= 1) score += 20;

  // ── Like count boost ────────────────────────────────────────────────────
  const likes = likeCounts[post.id] || 0;
  if (likes >= 100)      score += 20;
  else if (likes >= 50)  score += 15;
  else if (likes >= 10)  score += 10;
  else if (likes >= 1)   score += 5;

  // ── Recency decay ────────────────────────────────────────────────────────
  // Score halves every 7 days
  const ageMs = now - new Date(post.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(0.5, ageDays / 7);
  score *= decayFactor;

  // ── Preference boosts (applied AFTER decay so they don't compound) ───────
  if (prefs) {
    // Cuisine match: +20 per matching cuisine tag (up to +40 total)
    if (prefs.cuisines && prefs.cuisines.length > 0) {
      let cuisineBoost = 0;
      for (const tag of tags) {
        const mappedId = CUISINE_TAG_MAP[tag.name.toLowerCase()];
        if (mappedId && prefs.cuisines.includes(mappedId)) {
          cuisineBoost += 20;
        }
      }
      score += Math.min(cuisineBoost, 40);
    }

    // Cook time match: +15 if post recipe fits within preferred cook time
    if (prefs.cookTime && prefs.cookTime !== 'any') {
      const maxMinutes = COOK_TIME_LIMITS[prefs.cookTime];
      if (maxMinutes) {
        try {
          const recipe = db.prepare('SELECT cookTime FROM recipes WHERE postId = ?').get(post.id);
          if (recipe && recipe.cookTime !== null && recipe.cookTime <= maxMinutes) {
            score += 15;
          }
        } catch {
          // No recipe — no boost, no penalty
        }
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// GET /api/feed
// Query params: userId, cursor, limit, tags (comma-separated), mode
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { userId, mode = 'for_you' } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = req.query.cursor;
    const tagFilter = req.query.tags
      ? req.query.tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];

    let allPosts = jsonDb.getAllPosts();

    // ── Tag filter ──────────────────────────────────────────────────────────
    if (tagFilter.length > 0) {
      const placeholders = tagFilter.map(() => '?').join(',');
      const matchingPostIds = new Set(
        db.prepare(`
          SELECT postId FROM post_tags
          WHERE tagId IN (${placeholders})
          GROUP BY postId
          HAVING COUNT(DISTINCT tagId) = ?
        `).all(...tagFilter, tagFilter.length).map(r => r.postId)
      );
      allPosts = allPosts.filter(p => matchingPostIds.has(p.id));
    }

    // ── Following mode ──────────────────────────────────────────────────────
    if (mode === 'following') {
      const followedIds = getFollowedUserIds(userId);
      if (followedIds.size === 0) {
        return res.json({ posts: [], nextCursor: null, hasMore: false });
      }
      allPosts = allPosts.filter(p => followedIds.has(p.userId));
      allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Cursor pagination for following feed
      let startIndex = 0;
      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
          const idx = allPosts.findIndex(p => p.id === decoded.id);
          if (idx !== -1) startIndex = idx + 1;
        } catch (_) {}
      }
      const page = allPosts.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < allPosts.length;
      const nextCursor = hasMore && page.length > 0
        ? Buffer.from(JSON.stringify({ id: page[page.length - 1].id })).toString('base64')
        : null;

      return res.json({
        posts: page.map(p => ({ ...p, tags: getTagsForPost(p.id) })),
        nextCursor,
        hasMore,
      });
    }

    // ── For You mode ────────────────────────────────────────────────────────
    const followedIds = getFollowedUserIds(userId);
    const likeCounts = getLikeCounts();
    const prefs = userId ? getUserPreferences(userId) : null;
    const now = Date.now();

    // Score every post
    const scored = allPosts.map(post => {
      const tags = getTagsForPost(post.id);
      return {
        post,
        tags,
        score: scorePost(post, tags, followedIds, likeCounts, prefs, now),
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Cursor pagination on scored list
    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const idx = scored.findIndex(s => s.post.id === decoded.id);
        if (idx !== -1) startIndex = idx + 1;
      } catch (_) {}
    }

    const page = scored.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scored.length;
    const nextCursor = hasMore && page.length > 0
      ? Buffer.from(JSON.stringify({ id: page[page.length - 1].post.id })).toString('base64')
      : null;

    // New user fallback — if no posts scored above 0 return recency sorted
    const posts = page.map(s => ({ ...s.post, tags: s.tags }));
    if (posts.length === 0 && !cursor) {
      const fallback = allPosts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map(p => ({ ...p, tags: getTagsForPost(p.id) }));
      return res.json({ posts: fallback, nextCursor: null, hasMore: false });
    }

    res.json({ posts, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed.' });
  }
});

module.exports = router;
