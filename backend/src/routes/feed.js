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
// Helper: score a post for a given user
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

  // Signal 1: followed account
  if (followedUserIds.has(post.userId)) {
    score += 30;
  }

  // Signal 2: tag overlap
  const postTagIds = (post.tags || []).map((t) => t.id);
  const overlap = postTagIds.filter((id) => preferredTagIds.has(id)).length;
  if (overlap > 0) {
    score += 20 + Math.min(overlap * 5, 25);
  }

  // Signal 3: engagement (capped to avoid viral posts dominating forever)
  const likes = likeCounts[post.id] || 0;
  score += Math.min(likes, 20);

  // Recency decay — posts older than ~30 days approach 0 multiplier
  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(0.5, ageDays / 7);
  score *= decayFactor;

  return score;
}

// ---------------------------------------------------------------------------
// GET /api/feed
//
// Query params:
//   userId   – the current user's ID (required for personalisation)
//   cursor   – opaque pagination cursor (base64-encoded ISO timestamp)
//   limit    – number of posts to return (default 10, max 50)
//   tags     – comma-separated tag IDs to filter by (optional)
//
// Response:
//   { posts, nextCursor, hasMore }
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { userId, cursor, tags } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // ── 1. Resolve personalisation data ──────────────────────────────────

    // Followed accounts
    // TODO: replace with a real `follows` table query once that table exists.
    // Expected schema: follows(followerId TEXT, followingId TEXT)
    // Example query when ready:
    //   const followedUserIds = new Set(
    //     db.prepare('SELECT followingId FROM follows WHERE followerId = ?')
    //       .all(userId)
    //       .map(r => r.followingId)
    //   );
    const followedUserIds = new Set();

    // Preferred tags (derived from the user's own posts + explicit interactions)
    // TODO: replace with a real `user_tag_preferences` or `interactions` table.
    // For now we fall back to any tags the user has used on their own posts so
    // that even early users get *some* personalisation signal immediately.
    let preferredTagIds = new Set();
    if (userId) {
      try {
        const userPostIds = jsonDb
          .getAllPosts()
          .filter((p) => p.userId === userId)
          .map((p) => p.id);

        for (const pid of userPostIds) {
          const postTags = getTagsForPost(pid);
          for (const t of postTags) preferredTagIds.add(t.id);
        }
      } catch (_) {
        // Non-fatal — new user simply has no preferred tags yet
      }
    }

    // Explicit tag filter from the request overrides/extends preferences
    const filterTagIds =
      tags
        ? tags
            .split(',')
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : [];

    if (filterTagIds.length > 0) {
      filterTagIds.forEach((id) => preferredTagIds.add(id));
    }

    // Like counts per post
    // TODO: replace with a real `likes` table query once that table exists.
    // Expected schema: likes(postId TEXT, userId TEXT)
    // Example query when ready:
    //   const likeRows = db.prepare('SELECT postId, COUNT(*) as cnt FROM likes GROUP BY postId').all();
    //   const likeCounts = Object.fromEntries(likeRows.map(r => [r.postId, r.cnt]));
    const likeCounts = {};

    // ── 2. Load & filter posts ────────────────────────────────────────────

    let allPosts = jsonDb.getAllPosts();

    // If explicit tag filter is set, restrict to posts that have ALL those tags
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

    // Attach tags to every post (needed for scoring)
    allPosts = allPosts.map((post) => ({
      ...post,
      tags: getTagsForPost(post.id),
    }));

    // ── 3. Score & sort ───────────────────────────────────────────────────

    const scored = allPosts.map((post) => ({
      post,
      score: scorePost(post, followedUserIds, preferredTagIds, likeCounts),
    }));

    // Primary sort: score descending; secondary: recency descending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post.createdAt) - new Date(a.post.createdAt);
    });

    // ── 4. Cursor-based pagination ────────────────────────────────────────
    // The cursor encodes the (score, createdAt, id) triple of the last seen
    // post so we can resume exactly where we left off even as new posts arrive.

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        // Find the index just after the post matching the cursor
        const cursorIndex = scored.findIndex(
          ({ post, score }) =>
            post.id === decoded.id &&
            post.createdAt === decoded.createdAt
        );
        if (cursorIndex !== -1) startIndex = cursorIndex + 1;
      } catch (_) {
        // Malformed cursor — start from beginning
      }
    }

    const page = scored.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scored.length;

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ id: last.post.id, createdAt: last.post.createdAt, score: last.score })
      ).toString('base64');
    }

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
