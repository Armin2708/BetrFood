const express = require('express');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// Initialize tags and post_tags tables
function initializeTagsTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('cuisine', 'meal', 'dietary'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS post_tags (
      postId TEXT NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (postId, tagId),
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_post_tags_tagId ON post_tags(tagId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_post_tags_postId ON post_tags(postId)`);

  // Seed initial tags if table is empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM tags').get();
  if (count.cnt === 0) {
    const insert = db.prepare('INSERT INTO tags (name, type) VALUES (?, ?)');
    const seedMany = db.transaction((tags) => {
      for (const tag of tags) {
        insert.run(tag.name, tag.type);
      }
    });

    seedMany([
      { name: 'Italian', type: 'cuisine' },
      { name: 'Japanese', type: 'cuisine' },
      { name: 'Mexican', type: 'cuisine' },
      { name: 'Indian', type: 'cuisine' },
      { name: 'Thai', type: 'cuisine' },
      { name: 'Chinese', type: 'cuisine' },
      { name: 'French', type: 'cuisine' },
      { name: 'American', type: 'cuisine' },
      { name: 'Mediterranean', type: 'cuisine' },
      { name: 'Korean', type: 'cuisine' },
      { name: 'Breakfast', type: 'meal' },
      { name: 'Lunch', type: 'meal' },
      { name: 'Dinner', type: 'meal' },
      { name: 'Snack', type: 'meal' },
      { name: 'Dessert', type: 'meal' },
      { name: 'Brunch', type: 'meal' },
      { name: 'Vegan', type: 'dietary' },
      { name: 'Vegetarian', type: 'dietary' },
      { name: 'Gluten-Free', type: 'dietary' },
      { name: 'Keto', type: 'dietary' },
      { name: 'Paleo', type: 'dietary' },
      { name: 'Dairy-Free', type: 'dietary' },
      { name: 'Nut-Free', type: 'dietary' },
      { name: 'Low-Carb', type: 'dietary' },
    ]);
  }
}

initializeTagsTables();

function getTagsForPost(postId) {
  return db.prepare(`
    SELECT t.* FROM tags t
    JOIN post_tags pt ON pt.tagId = t.id
    WHERE pt.postId = ?
    ORDER BY t.type, t.name
  `).all(postId);
}

function getPostIdsByTags(tagIds) {
  const placeholders = tagIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT postId FROM post_tags
    WHERE tagId IN (${placeholders})
    GROUP BY postId
    HAVING COUNT(DISTINCT tagId) = ?
  `).all(...tagIds, tagIds.length).map(row => row.postId);
}

// GET /api/tags
router.get('/', (req, res) => {
  try {
    const { type } = req.query;
    let tags;
    if (type) {
      tags = db.prepare('SELECT * FROM tags WHERE type = ? ORDER BY name').all(type);
    } else {
      tags = db.prepare('SELECT * FROM tags ORDER BY type, name').all();
    }
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

// GET /api/posts/by-tags?tags=1,2,3
router.get('/posts/by-tags', (req, res) => {
  try {
    const tagsParam = req.query.tags;
    if (!tagsParam) {
      return res.status(400).json({ error: 'tags query parameter is required.' });
    }

    const tagIds = tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (tagIds.length === 0) {
      return res.status(400).json({ error: 'Invalid tag IDs.' });
    }

    const postIds = getPostIdsByTags(tagIds);
    const posts = postIds
      .map(id => jsonDb.getPostById(id))
      .filter(post => post !== null)
      .map(post => ({ ...post, tags: getTagsForPost(post.id) }));

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (error) {
    console.error('Error filtering posts by tags:', error);
    res.status(500).json({ error: 'Failed to filter posts.' });
  }
});

// POST /api/posts/:id/tags
router.post('/posts/:id/tags', (req, res) => {
  const postId = req.params.id;
  const { tagIds } = req.body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return res.status(400).json({ error: 'tagIds array is required.' });
  }

  try {
    const post = jsonDb.getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const placeholders = tagIds.map(() => '?').join(',');
    const existingTags = db.prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`).all(...tagIds);
    if (existingTags.length !== tagIds.length) {
      return res.status(400).json({ error: 'One or more tag IDs are invalid.' });
    }

    const insertTag = db.prepare('INSERT OR IGNORE INTO post_tags (postId, tagId) VALUES (?, ?)');
    const addTags = db.transaction((ids) => {
      for (const tagId of ids) {
        insertTag.run(postId, tagId);
      }
    });
    addTags(tagIds);

    const tags = getTagsForPost(postId);
    res.json({ postId, tags });
  } catch (error) {
    console.error('Error adding tags to post:', error);
    res.status(500).json({ error: 'Failed to add tags.' });
  }
});

// DELETE /api/posts/:id/tags/:tagId
router.delete('/posts/:id/tags/:tagId', (req, res) => {
  const { id: postId, tagId } = req.params;

  try {
    const result = db.prepare('DELETE FROM post_tags WHERE postId = ? AND tagId = ?').run(postId, parseInt(tagId));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tag not found on this post.' });
    }
    res.json({ message: 'Tag removed from post.' });
  } catch (error) {
    console.error('Error removing tag from post:', error);
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

// GET /api/posts/:id/tags
router.get('/posts/:id/tags', (req, res) => {
  try {
    const tags = getTagsForPost(req.params.id);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching post tags:', error);
    res.status(500).json({ error: 'Failed to fetch post tags.' });
  }
});

module.exports = router;
