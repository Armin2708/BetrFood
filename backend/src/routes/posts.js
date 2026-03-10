const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// File upload — images (up to 10) + single video
// ---------------------------------------------------------------------------
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/mov'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max per file
});

// Accept: up to 10 images OR 1 video
const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]);

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

function getRecipeForPost(postId) {
  try {
    const recipe = db.prepare(`SELECT * FROM recipes WHERE postId = ?`).get(postId);
    if (!recipe) return null;
    const ingredients = db.prepare(
      `SELECT * FROM recipe_ingredients WHERE recipeId = ? ORDER BY orderIndex`
    ).all(recipe.id);
    const steps = db.prepare(
      `SELECT * FROM recipe_steps WHERE recipeId = ? ORDER BY stepNumber`
    ).all(recipe.id);
    return { ...recipe, ingredients, steps };
  } catch {
    return null;
  }
}

function initializeRecipeTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL UNIQUE,
      cookTime INTEGER,
      servings INTEGER,
      difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy'
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipeId TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_steps (
      id TEXT PRIMARY KEY,
      recipeId TEXT NOT NULL,
      stepNumber INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);
}

initializeRecipeTables();

// ---------------------------------------------------------------------------
// GET /api/posts
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = req.query.cursor;

    let allPosts = jsonDb.getAllPosts();
    allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const idx = allPosts.findIndex((p) => p.id === decoded.id);
        if (idx !== -1) startIndex = idx + 1;
      } catch (_) {}
    }

    const page = allPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allPosts.length;
    const nextCursor = hasMore && page.length > 0
      ? Buffer.from(JSON.stringify({ id: page[page.length - 1].id })).toString('base64')
      : null;

    res.json({ posts: page.map(p => ({ ...p, tags: getTagsForPost(p.id) })), nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/posts/by-tags
// ---------------------------------------------------------------------------
router.get('/by-tags', (req, res) => {
  try {
    const tagsParam = req.query.tags;
    if (!tagsParam) return res.status(400).json({ error: 'tags query parameter is required.' });

    const tagIds = tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (tagIds.length === 0) return res.status(400).json({ error: 'Invalid tag IDs.' });

    const placeholders = tagIds.map(() => '?').join(',');
    const matchingPostIds = db.prepare(`
      SELECT postId FROM post_tags
      WHERE tagId IN (${placeholders})
      GROUP BY postId
      HAVING COUNT(DISTINCT tagId) = ?
    `).all(...tagIds, tagIds.length).map(r => r.postId);

    const posts = matchingPostIds
      .map(id => jsonDb.getPostById(id))
      .filter(Boolean)
      .map(post => ({ ...post, tags: getTagsForPost(post.id) }));

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to filter posts.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/posts/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json({ ...post, tags: getTagsForPost(post.id), recipe: getRecipeForPost(post.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/posts — create post with images or video
// ---------------------------------------------------------------------------
router.post('/', uploadFields, (req, res) => {
  try {
    const { caption, userId, recipe } = req.body;
    if (!caption) return res.status(400).json({ error: 'Caption is required.' });

    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video || [];

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(400).json({ error: 'At least one image or a video is required.' });
    }
    if (imageFiles.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 images per post.' });
    }

    // Build image paths
    const imagePaths = imageFiles.map(f => `/uploads/${f.filename}`);

    // Build video path
    let videoPath = null;
    let videoType = null;
    if (videoFiles.length > 0) {
      videoPath = `/uploads/${videoFiles[0].filename}`;
      videoType = videoFiles[0].mimetype;
      // TODO: trigger async transcoding job here (e.g. Cloudinary, AWS MediaConvert)
      // e.g. await transcodeVideo(videoPath);
    }

    const post = jsonDb.createPost({
      caption,
      userId: userId || 'current-user',
      imagePath: imagePaths[0] || '',
      imagePaths,
      videoPath,
      videoType,
    });

    // Save recipe if provided
    if (recipe) {
      try {
        const recipeData = typeof recipe === 'string' ? JSON.parse(recipe) : recipe;
        const { randomUUID } = require('crypto');
        const recipeId = randomUUID();
        db.prepare(`INSERT INTO recipes (id, postId, cookTime, servings, difficulty) VALUES (?, ?, ?, ?, ?)`)
          .run(recipeId, post.id, recipeData.cookTime || null, recipeData.servings || null, recipeData.difficulty || 'easy');

        if (recipeData.ingredients?.length) {
          const ins = db.prepare(`INSERT INTO recipe_ingredients (id, recipeId, name, quantity, unit, orderIndex) VALUES (?, ?, ?, ?, ?, ?)`);
          recipeData.ingredients.forEach((ing, idx) => ins.run(randomUUID(), recipeId, ing.name, ing.quantity || null, ing.unit || null, idx));
        }
        if (recipeData.steps?.length) {
          const ins = db.prepare(`INSERT INTO recipe_steps (id, recipeId, stepNumber, instruction) VALUES (?, ?, ?, ?)`);
          recipeData.steps.forEach((step, idx) => ins.run(randomUUID(), recipeId, idx + 1, step.instruction));
        }
      } catch (e) {
        console.error('Failed to save recipe:', e);
      }
    }

    res.status(201).json({ ...post, tags: [], recipe: getRecipeForPost(post.id) });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/posts/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });
    const updated = jsonDb.updatePost(req.params.id, { caption: req.body.caption });
    res.json({ ...updated, tags: getTagsForPost(updated.id), recipe: getRecipeForPost(updated.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/posts/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });
    jsonDb.deletePost(req.params.id);
    res.json({ message: 'Post deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// ---------------------------------------------------------------------------
// Recipe routes
// ---------------------------------------------------------------------------
router.get('/:id/recipe', (req, res) => {
  try {
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const recipe = getRecipeForPost(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'No recipe for this post.' });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

router.put('/:id/recipe', (req, res) => {
  try {
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const { randomUUID } = require('crypto');
    const { cookTime, servings, difficulty, ingredients, steps } = req.body;
    let recipe = db.prepare(`SELECT * FROM recipes WHERE postId = ?`).get(req.params.id);
    if (!recipe) {
      const recipeId = randomUUID();
      db.prepare(`INSERT INTO recipes (id, postId, cookTime, servings, difficulty) VALUES (?, ?, ?, ?, ?)`)
        .run(recipeId, req.params.id, cookTime || null, servings || null, difficulty || 'easy');
      recipe = db.prepare(`SELECT * FROM recipes WHERE id = ?`).get(recipeId);
    } else {
      db.prepare(`UPDATE recipes SET cookTime = ?, servings = ?, difficulty = ? WHERE id = ?`)
        .run(cookTime || null, servings || null, difficulty || 'easy', recipe.id);
    }
    if (ingredients) {
      db.prepare(`DELETE FROM recipe_ingredients WHERE recipeId = ?`).run(recipe.id);
      const ins = db.prepare(`INSERT INTO recipe_ingredients (id, recipeId, name, quantity, unit, orderIndex) VALUES (?, ?, ?, ?, ?, ?)`);
      ingredients.forEach((ing, idx) => ins.run(randomUUID(), recipe.id, ing.name, ing.quantity || null, ing.unit || null, idx));
    }
    if (steps) {
      db.prepare(`DELETE FROM recipe_steps WHERE recipeId = ?`).run(recipe.id);
      const ins = db.prepare(`INSERT INTO recipe_steps (id, recipeId, stepNumber, instruction) VALUES (?, ?, ?, ?)`);
      steps.forEach((step, idx) => ins.run(randomUUID(), recipe.id, idx + 1, step.instruction));
    }
    res.json(getRecipeForPost(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
});

// ---------------------------------------------------------------------------
// Tag routes
// ---------------------------------------------------------------------------
router.post('/:id/tags', (req, res) => {
  const { tagIds } = req.body;
  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0)
    return res.status(400).json({ error: 'tagIds array is required.' });
  try {
    const post = jsonDb.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const placeholders = tagIds.map(() => '?').join(',');
    const existing = db.prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`).all(...tagIds);
    if (existing.length !== tagIds.length) return res.status(400).json({ error: 'One or more tag IDs are invalid.' });
    const ins = db.prepare('INSERT OR IGNORE INTO post_tags (postId, tagId) VALUES (?, ?)');
    db.transaction((ids) => { for (const tagId of ids) ins.run(req.params.id, tagId); })(tagIds);
    res.json({ postId: req.params.id, tags: getTagsForPost(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add tags.' });
  }
});

router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM post_tags WHERE postId = ? AND tagId = ?')
      .run(req.params.id, parseInt(req.params.tagId));
    if (result.changes === 0) return res.status(404).json({ error: 'Tag not found on this post.' });
    res.json({ message: 'Tag removed from post.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

router.get('/:id/tags', (req, res) => {
  try {
    res.json(getTagsForPost(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post tags.' });
  }
});

module.exports = router;
