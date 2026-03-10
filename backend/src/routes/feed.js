const express = require('express');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: get tags for a post
// ---------------------------------------------------------------------------
function getTagsForPost(postId) {
  return db
    .prepare(
      `SELECT t.* FROM tags t
       JOIN post_tags pt ON pt.tagId = t.id
       WHERE pt.postId = ?
       ORDER BY t.type, t.name`
    )
    .all(postId);
}

// ---------------------------------------------------------------------------
// Helper: get followed user IDs for a given user
// TODO: replace with a real `follows` table query once that table exists.
// Expected schema: follows(followerId TEXT, followingId TEXT)
// ---------------------------------------------------------------------------
function getFollowedUserIds(userId) {
  // Example query when ready:
  // return new Set(
  //   db.prepare('SELECT followingId FROM follows WHERE followerId = ?')
  //     .all(userId)
  //     .map(r => r.followingId)
  // );
  return new Set();
}

// ---------------------------------------------------------------------------
// Helper: score a post for a given user (used by For You feed only)
//
// Ranking signals (all additive):
//   +30  post is from a followed account
//   +20  post shares at least one tag with the user's preferred tags
//   + 5  per overlapping preferred tag (up to +25 extra)
//   + 1  per like the post has received (up to +20)
//   recency decay: score is multiplied by a factor that halves every 7 days
//
// New users (no follows, no preferred tags, no interactions) receive a score
// of 0 for every post, which means the feed falls back to pure recency order.
// ---------------------------------------------------------------------------
function scorePost(post, followedUserIds, preferredTagIds, likeCounts) {
  let score = 0;

  if (followedUserIds.has(post.userId)) score += 30;

  const postTagIds = (post.tags || []).map((t) => t.id);
  const overlap = postTagIds.filter((id) => preferredTagIds.has(id)).length;
  if (overlap > 0) score += 20 + Math.min(overlap * 5, 25);

  const likes = likeCounts[post.id] || 0;
  score += Math.min(likes, 20);

  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  score *= Math.pow(0.5, ageDays / 7);

  return score;
}

// ---------------------------------------------------------------------------
// GET /api/feed
//
// Query params:
//   userId   – the current user's ID (required for personalisation)
//   mode     – 'for_you' (default) | 'following'
//   cursor   – opaque pagination cursor (base64-encoded JSON)
//   limit    – number of posts to return (default 10, max 50)
//   tags     – comma-separated tag IDs to filter by (optional)
//
// Response:
//   { posts, nextCursor, hasMore }
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { userId, cursor, tags } = req.query;
    const mode = req.query.mode === 'following' ? 'following' : 'for_you';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // ── 1. Resolve followed accounts ──────────────────────────────────────

    const followedUserIds = getFollowedUserIds(userId);

    // ── Following mode ────────────────────────────────────────────────────
    // Only posts from followed accounts, sorted by recency.
    // Falls back to all posts if the user follows nobody yet.

    if (mode === 'following') {
      let followingPosts = followedUserIds.size > 0
        ? jsonDb.getAllPosts().filter((p) => followedUserIds.has(p.userId))
        : jsonDb.getAllPosts();

      followingPosts = followingPosts.map((post) => ({
        ...post,
        tags: getTagsForPost(post.id),
      }));

      followingPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let startIndex = 0;
      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
          const idx = followingPosts.findIndex((p) => p.id === decoded.id);
          if (idx !== -1) startIndex = idx + 1;
        } catch (_) {}
      }

      const page = followingPosts.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < followingPosts.length;
      const nextCursor = hasMore && page.length > 0
        ? Buffer.from(JSON.stringify({ id: page[page.length - 1].id })).toString('base64')
        : null;

      return res.json({ posts: page, nextCursor, hasMore });
    }

    // ── For You mode ──────────────────────────────────────────────────────

    let allPosts = jsonDb.getAllPosts();

    // Explicit tag filter
    const filterTagIds = tags
      ? tags.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id))
      : [];

    if (filterTagIds.length > 0) {
      const placeholders = filterTagIds.map(() => '?').join(',');
      const matchingPostIds = new Set(
        db
          .prepare(
            `SELECT postId FROM post_tags
             WHERE tagId IN (${placeholders})
             GROUP BY postId
             HAVING COUNT(DISTINCT tagId) = ?`
          )
          .all(...filterTagIds, filterTagIds.length)
          .map((r) => r.postId)
      );
      allPosts = allPosts.filter((p) => matchingPostIds.has(p.id));
    }

    // Preferred tags from user's own post history
    let preferredTagIds = new Set();
    if (userId) {
      try {
        const userPostIds = jsonDb
          .getAllPosts()
          .filter((p) => p.userId === userId)
          .map((p) => p.id);
        for (const pid of userPostIds) {
          for (const t of getTagsForPost(pid)) preferredTagIds.add(t.id);
        }
      } catch (_) {}
    }
    filterTagIds.forEach((id) => preferredTagIds.add(id));

    // Like counts
    // TODO: replace with real likes table query once that table exists.
    const likeCounts = {};

    // Attach tags & score
    const scored = allPosts
      .map((post) => ({ ...post, tags: getTagsForPost(post.id) }))
      .map((post) => ({
        post,
        score: scorePost(post, followedUserIds, preferredTagIds, likeCounts),
      }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post.createdAt) - new Date(a.post.createdAt);
    });

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const idx = scored.findIndex(({ post }) => post.id === decoded.id && post.createdAt === decoded.createdAt);
        if (idx !== -1) startIndex = idx + 1;
      } catch (_) {}
    }

    const page = scored.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scored.length;
    const nextCursor = hasMore && page.length > 0
      ? Buffer.from(JSON.stringify({
          id: page[page.length - 1].post.id,
          createdAt: page[page.length - 1].post.createdAt,
          score: page[page.length - 1].score,
        })).toString('base64')
      : null;

    res.json({
      posts: page.map(({ post }) => post),
      nextCursor,
      hasMore,
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed.' });
  }
});

module.exports = router;
