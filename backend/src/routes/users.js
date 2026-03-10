const express = require('express');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Initialize users table
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    displayName TEXT,
    bio TEXT,
    avatarUrl TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

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
  const posts = jsonDb.getAllPosts().filter((p) => p.userId === userId);
  const postCount = posts.length;

  // TODO: replace with real follows table queries once that table exists
  // followerCount: SELECT COUNT(*) FROM follows WHERE followingId = userId
  // followingCount: SELECT COUNT(*) FROM follows WHERE followerId = userId
  const followerCount = 0;
  const followingCount = 0;

  return { postCount, followerCount, followingCount };
}

function ensureUser(userId) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, displayName, bio, avatarUrl)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, userId, userId, '', '');
  }
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// ---------------------------------------------------------------------------
// GET /api/users/:id — user profile + stats
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const user = ensureUser(req.params.id);
    const stats = getUserStats(req.params.id);
    res.json({ ...user, ...stats });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id — update profile (username, displayName, bio, avatarUrl)
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    ensureUser(req.params.id);
    const { username, displayName, bio, avatarUrl } = req.body;

    // Check username uniqueness if changing it
    if (username) {
      const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
      if (conflict) return res.status(409).json({ error: 'Username already taken.' });
    }

    db.prepare(`
      UPDATE users
      SET username = COALESCE(?, username),
          displayName = COALESCE(?, displayName),
          bio = COALESCE(?, bio),
          avatarUrl = COALESCE(?, avatarUrl)
      WHERE id = ?
    `).run(username || null, displayName || null, bio || null, avatarUrl || null, req.params.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    const stats = getUserStats(req.params.id);
    res.json({ ...user, ...stats });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:id/posts — paginated posts by user
// ---------------------------------------------------------------------------
router.get('/:id/posts', (req, res) => {
  try {
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
    res.json({ posts, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
  }
});

module.exports = router;
