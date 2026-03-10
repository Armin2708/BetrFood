const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const videoTypes = /mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (imageTypes.test(ext) || mime.startsWith('image/')) return cb(null, true);
    if (videoTypes.test(ext) || mime.startsWith('video/')) return cb(null, true);
    cb(new Error('Only image or video files are allowed'));
  },
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    imagePath: post.image_path || (post.image_paths?.[0] ?? null),
    imagePaths: post.image_paths || [],
    videoPath: post.video_path || null,
    videoType: post.video_type || null,
    isDraft: post.is_draft || false,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    editedAt: post.edited_at || null,
  };
}

function deleteFile(filePath) {
  try {
    const full = path.join(uploadsDir, path.basename(filePath));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) { console.error('Failed to delete file:', e.message); }
}

async function getPostTags(postId) {
  const { data } = await supabase
    .from('post_tags')
    .select('tags(id, name, type)')
    .eq('post_id', postId);
  return (data || []).map(r => r.tags);
}

async function getRecipe(postId) {
  const { data: recipe } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*), recipe_steps(*)')
    .eq('post_id', postId)
    .single();
  if (!recipe) return null;
  return {
    id: recipe.id,
    postId: recipe.post_id,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    ingredients: (recipe.recipe_ingredients || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, orderIndex: i.order_index })),
    steps: (recipe.recipe_steps || [])
      .sort((a, b) => a.step_number - b.step_number)
      .map(s => ({ id: s.id, stepNumber: s.step_number, instruction: s.instruction })),
  };
}

// ── GET /api/posts ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = req.query.cursor || null;

    let query = supabase
      .from('posts')
      .select('*')
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

    res.json({ posts: page.map(mapPost), nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ── GET /api/posts/drafts ─────────────────────────────────────────────────────
router.get('/drafts', requireAuth, async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((posts || []).map(mapPost));
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts.' });
  }
});

// ── GET /api/posts/by-tags ────────────────────────────────────────────────────
router.get('/by-tags', async (req, res) => {
  try {
    const tagIds = req.query.tags ? req.query.tags.split(',').map(Number).filter(Boolean) : [];
    if (tagIds.length === 0) return res.json([]);

    const { data: postTags } = await supabase
      .from('post_tags')
      .select('post_id')
      .in('tag_id', tagIds);

    const postIds = [...new Set((postTags || []).map(pt => pt.post_id))];
    if (postIds.length === 0) return res.json([]);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds)
      .eq('is_draft', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((posts || []).map(mapPost));
  } catch (error) {
    console.error('Error fetching posts by tags:', error);
    res.status(500).json({ error: 'Failed to filter posts.' });
  }
});

// ── GET /api/posts/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !post) return res.status(404).json({ error: 'Post not found.' });

    const [tags, recipe] = await Promise.all([getPostTags(post.id), getRecipe(post.id)]);
    res.json({ ...mapPost(post), tags, recipe });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// ── POST /api/posts ───────────────────────────────────────────────────────────
router.post('/', requireAuth, uploadFields, async (req, res) => {
  try {
    const caption = (req.body.caption || '').slice(0, 500);
    const isDraft = req.body.isDraft === 'true';
    const imageFiles = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;

    if (!isDraft && imageFiles.length === 0 && !videoFile) {
      return res.status(400).json({ error: 'At least one image or video is required.' });
    }

    const imagePaths = imageFiles.map(f => `/uploads/${f.filename}`);
    const imagePath = imagePaths[0] || null;
    const videoPath = videoFile ? `/uploads/${videoFile.filename}` : null;
    const videoType = videoFile ? videoFile.mimetype : null;
    const now = new Date().toISOString();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        caption,
        image_path: imagePath,
        image_paths: imagePaths,
        video_path: videoPath,
        video_type: videoType,
        is_draft: isDraft,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Save recipe if provided
    if (req.body.recipe) {
      try {
        const recipeInput = JSON.parse(req.body.recipe);
        await upsertRecipe(post.id, recipeInput);
      } catch (_) {}
    }

    res.status(201).json(mapPost(post));
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// ── POST /api/posts/:id/publish ───────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized.' });
    if (!post.is_draft) return res.status(400).json({ error: 'Post is already published.' });

    if (post.image_paths?.length === 0 && !post.video_path) {
      return res.status(400).json({ error: 'Cannot publish a draft with no media.' });
    }

    const { data: updated, error } = await supabase
      .from('posts')
      .update({ is_draft: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapPost(updated));
  } catch (error) {
    console.error('Error publishing draft:', error);
    res.status(500).json({ error: 'Failed to publish draft.' });
  }
});

// ── PUT /api/posts/:id ────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized.' });

    const updates = {};
    if (req.body.caption !== undefined) updates.caption = String(req.body.caption).slice(0, 500);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields provided.' });

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

// ── DELETE /api/posts/:id ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized.' });

    // Delete media files from disk
    (post.image_paths || []).forEach(deleteFile);
    if (post.image_path) deleteFile(post.image_path);
    if (post.video_path) deleteFile(post.video_path);

    const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// ── GET /api/posts/:id/recipe ─────────────────────────────────────────────────
router.get('/:id/recipe', async (req, res) => {
  try {
    const recipe = await getRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

// ── PUT /api/posts/:id/recipe ─────────────────────────────────────────────────
router.put('/:id/recipe', requireAuth, async (req, res) => {
  try {
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized.' });

    const recipe = await upsertRecipe(req.params.id, req.body);
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
});

// ── GET /api/posts/:id/tags ───────────────────────────────────────────────────
router.get('/:id/tags', async (req, res) => {
  try {
    res.json(await getPostTags(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

// ── POST /api/posts/:id/tags ──────────────────────────────────────────────────
router.post('/:id/tags', requireAuth, async (req, res) => {
  try {
    const { tagIds } = req.body;
    if (!Array.isArray(tagIds) || tagIds.length === 0) return res.status(400).json({ error: 'tagIds array is required.' });

    const inserts = tagIds.map(tagId => ({ post_id: req.params.id, tag_id: tagId }));
    const { error } = await supabase.from('post_tags').upsert(inserts, { onConflict: 'post_id,tag_id' });
    if (error) throw error;

    res.json({ postId: req.params.id, tags: await getPostTags(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add tags.' });
  }
});

// ── DELETE /api/posts/:id/tags/:tagId ─────────────────────────────────────────
router.delete('/:id/tags/:tagId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', req.params.id)
      .eq('tag_id', req.params.tagId);
    if (error) throw error;
    res.json({ message: 'Tag removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

// ── Upsert recipe helper ──────────────────────────────────────────────────────
async function upsertRecipe(postId, input) {
  const { cookTime, servings, difficulty, ingredients = [], steps = [] } = input;

  const { data: existing } = await supabase.from('recipes').select('id').eq('post_id', postId).single();

  let recipeId;
  if (existing) {
    await supabase.from('recipes').update({
      cook_time: cookTime ?? null,
      servings: servings ?? null,
      difficulty: difficulty ?? 'easy',
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
    recipeId = existing.id;
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);
  } else {
    const { data: newRecipe } = await supabase.from('recipes').insert({
      post_id: postId,
      cook_time: cookTime ?? null,
      servings: servings ?? null,
      difficulty: difficulty ?? 'easy',
    }).select().single();
    recipeId = newRecipe.id;
  }

  if (ingredients.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      ingredients.map((ing, i) => ({
        recipe_id: recipeId,
        name: ing.name,
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        order_index: i,
      }))
    );
  }

  if (steps.length > 0) {
    await supabase.from('recipe_steps').insert(
      steps.map((s, i) => ({
        recipe_id: recipeId,
        step_number: i + 1,
        instruction: s.instruction,
      }))
    );
  }

  return getRecipe(postId);
}

module.exports = router;
