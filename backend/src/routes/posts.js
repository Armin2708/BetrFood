const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

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
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const caption = (req.body.caption || '').slice(0, 500);
    const now = new Date().toISOString();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        caption,
        image_path: `/uploads/${req.file.filename}`,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(mapPost(post));
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
