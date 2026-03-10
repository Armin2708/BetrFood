const express = require('express');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Initialize tables
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    displayName TEXT,
    bio TEXT,
    avatarUrl TEXT,
    isPrivate INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    followerId TEXT NOT NULL,
    followingId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (followerId, followingId)
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_follows_followerId ON follows(followerId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_follows_followingId ON follows(followingId)`);

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

function getUserStats(userId) {
  const postCount = jsonDb.getAllPosts().filter((p) => p.userId === userId).length;
  const followerCount = db.prepare('SELECT COUNT(*) as cnt FROM follows WHERE followingId = ?').get(userId)?.cnt ?? 0;
  const followingCount = db.prepare('SELECT COUNT(*) as cnt FROM follows WHERE followerId = ?').get(userId)?.cnt ?? 0;
  return { postCount, followerCount, followingCount };
}

function ensureUser(userId) {
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, displayName, bio, avatarUrl, isPrivate)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(userId, userId, userId, '', '');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// ---------------------------------------------------------------------------
// GET /api/users/:id — user profile + stats
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const user = ensureUser(req.params.id);
    const stats = getUserStats(req.params.id);
    res.json({ ...user, ...stats, isPrivate: user.isPrivate === 1 });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id — update profile
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    ensureUser(req.params.id);
    const { username, displayName, bio, avatarUrl, isPrivate } = req.body;

    if (username) {
      const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
      if (conflict) return res.status(409).json({ error: 'Username already taken.' });
    }

    db.prepare(`
      UPDATE users
      SET username    = COALESCE(?, username),
          displayName = COALESCE(?, displayName),
          bio         = COALESCE(?, bio),
          avatarUrl   = COALESCE(?, avatarUrl),
          isPrivate   = COALESCE(?, isPrivate)
      WHERE id = ?
    `).run(
      username ?? null,
      displayName ?? null,
      bio ?? null,
      avatarUrl ?? null,
      isPrivate != null ? (isPrivate ? 1 : 0) : null,
      req.params.id
    );

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    const stats = getUserStats(req.params.id);
    res.json({ ...user, ...stats, isPrivate: user.isPrivate === 1 });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:id/posts — paginated posts by user
// Respects privacy: private profiles only return posts if requester follows them
// ---------------------------------------------------------------------------
router.get('/:id/posts', (req, res) => {
  try {
    const { requesterId } = req.query;
    const user = ensureUser(req.params.id);
    const isOwnProfile = requesterId === req.params.id;

    if (user.isPrivate && !isOwnProfile) {
      const isFollowing = db.prepare(
        'SELECT 1 FROM follows WHERE followerId = ? AND followingId = ?'
      ).get(requesterId, req.params.id);
      if (!isFollowing) {
        return res.json({ posts: [], nextCursor: null, hasMore: false, restricted: true });
      }
    }

    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const cursor = req.query.cursor;

    let userPosts = jsonDb.getAllPosts()
      .filter((p) => p.userId === req.params.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const idx = userPosts.findIndex((p) => p.id === decoded.id);
        if (idx !== -1) startIndex = idx + 1;
      } catch (_) {}
    }

    const page = userPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < userPosts.length;
    const nextCursor = hasMore && page.length > 0
      ? Buffer.from(JSON.stringify({ id: page[page.length - 1].id })).toString('base64')
      : null;

    const posts = page.map((post) => ({ ...post, tags: getTagsForPost(post.id) }));
    res.json({ posts, nextCursor, hasMore, restricted: false });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:id/follow-status?requesterId=xxx
// ---------------------------------------------------------------------------
router.get('/:id/follow-status', (req, res) => {
  try {
    const { requesterId } = req.query;
    if (!requesterId) return res.json({ isFollowing: false });
    const isFollowing = !!db.prepare(
      'SELECT 1 FROM follows WHERE followerId = ? AND followingId = ?'
    ).get(requesterId, req.params.id);
    res.json({ isFollowing });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/:id/follow — follow a user
// Body: { followerId }
// ---------------------------------------------------------------------------
router.post('/:id/follow', (req, res) => {
  try {
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: 'followerId is required.' });
    if (followerId === req.params.id) return res.status(400).json({ error: 'Cannot follow yourself.' });

    ensureUser(req.params.id);
    ensureUser(followerId);

    db.prepare(`
      INSERT OR IGNORE INTO follows (followerId, followingId) VALUES (?, ?)
    `).run(followerId, req.params.id);

    const stats = getUserStats(req.params.id);
    res.json({ isFollowing: true, ...stats });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id/follow — unfollow a user
// Body: { followerId }
// ---------------------------------------------------------------------------
router.delete('/:id/follow', (req, res) => {
  try {
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: 'followerId is required.' });

    db.prepare('DELETE FROM follows WHERE followerId = ? AND followingId = ?')
      .run(followerId, req.params.id);

    const stats = getUserStats(req.params.id);
    res.json({ isFollowing: false, ...stats });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user.' });
  }
});

module.exports = router;
