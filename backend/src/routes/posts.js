const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
// RBAC middleware available for future role-gated features:
// const { requireRole, requireMinRole } = require('../middleware/rbac');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  },
});

// GET /api/posts - cursor-based paginated feed
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const cursor = req.query.cursor || null;

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      // Get the cursor post's created_at
      const { data: cursorPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', cursor)
        .single();

      if (!cursorPost) {
        return res.json({ posts: [], nextCursor: null, hasMore: false });
      }
      query = query.lt('created_at', cursorPost.created_at);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    // Map to camelCase for frontend compatibility
    const mapped = resultPosts.map(mapPost);

    res.json({ posts: mapped, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/posts/:id - single post
router.get('/:id', async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !post) return res.status(404).json({ error: 'Post not found' });
    res.json(mapPost(post));
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts - create post with image upload (auth required)
// Future: gate to creator+ with requireMinRole('creator') after requireAuth
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Optimize uploaded image: resize to max 1200px wide, convert to JPEG, quality 80
    const optimizedFilename = `${uuidv4()}.jpg`;
    const optimizedPath = path.join(uploadsDir, optimizedFilename);
    try {
      await sharp(req.file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(optimizedPath);
      // Remove the original unoptimized file
      fs.unlinkSync(req.file.path);
    } catch (sharpErr) {
      console.error('Image optimization failed, using original:', sharpErr.message);
      // Fall back to original file if sharp fails
    }
    const finalFilename = fs.existsSync(optimizedPath) ? optimizedFilename : req.file.filename;

    const caption = (req.body.caption || '').slice(0, 500);
    const now = new Date().toISOString();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        caption,
        image_path: `/uploads/${finalFilename}`,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Handle optional recipe data
    let recipeData = null;
    if (req.body.recipe) {
      try {
        const recipe = typeof req.body.recipe === 'string'
          ? JSON.parse(req.body.recipe)
          : req.body.recipe;

        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            post_id: post.id,
            cook_time: recipe.cookTime || null,
            servings: recipe.servings || null,
            difficulty: recipe.difficulty || null,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (recipeError) throw recipeError;

        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const ingredientRows = recipe.ingredients.map((ing, idx) => ({
            recipe_id: newRecipe.id,
            name: ing.name,
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            order_index: idx,
          }));
          await supabase.from('recipe_ingredients').insert(ingredientRows);
        }

        if (recipe.steps && recipe.steps.length > 0) {
          const stepRows = recipe.steps.map((step, idx) => ({
            recipe_id: newRecipe.id,
            step_number: idx + 1,
            instruction: step.instruction,
          }));
          await supabase.from('recipe_steps').insert(stepRows);
        }

        recipeData = { id: newRecipe.id, postId: post.id };
      } catch (recipeErr) {
        console.error('Error creating recipe with post:', recipeErr);
        // Post was created successfully, just log recipe error
      }
    }

    const result = mapPost(post);
    if (recipeData) result.recipeId = recipeData.id;
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id - update post (owner only, auth required)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to edit this post.' });
    }

    const updates = {};
    if (req.body.caption !== undefined) {
      if (typeof req.body.caption !== 'string') {
        return res.status(400).json({ error: 'Caption must be a string.' });
      }
      updates.caption = req.body.caption.slice(0, 500);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: now, edited_at: now })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapPost(updated));
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id - delete post (owner only, auth required)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Clean up image file
    if (post.image_path) {
      const imgPath = path.join(__dirname, '..', '..', post.image_path);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// Map Supabase snake_case to camelCase for frontend
function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    imagePath: post.image_path,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    editedAt: post.edited_at || null,
  };
}

module.exports = router;
