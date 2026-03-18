const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Compress video to 720p MP4
function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', 'scale=-2:720',        // 720p height, auto width (divisible by 2)
        '-c:v', 'libx264',            // H.264 codec
        '-preset', 'fast',            // Encoding speed
        '-crf', '28',                 // Quality (lower = better, 28 = good compression)
        '-c:a', 'aac',               // AAC audio
        '-b:a', '128k',              // Audio bitrate
        '-movflags', '+faststart',   // Enable streaming
        '-y',                         // Overwrite output
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
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

const allowedImages = /jpeg|jpg|png|gif|webp|heif|heic/;
const allowedVideos = /mp4|mov|quicktime|webm/;

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video support
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeSub = file.mimetype.split('/')[1];

    const isImage = allowedImages.test(mimeSub) && (ext ? allowedImages.test(ext) : true);
    const isVideo = file.mimetype.startsWith('video/') && (ext ? allowedVideos.test(ext) : true);

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only image (jpeg, jpg, png, gif, webp, heif, heic) and video (mp4, mov, webm) files are allowed'));
    }
  },
});

// GET /api/posts - cursor-based paginated feed
router.get('/', optionalAuth, async (req, res) => {
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

    // Filter out posts from blocked and muted users
    const excludedIds = req.userId ? await getExcludedUserIds(req.userId) : new Set();
    const filteredPosts = excludedIds.size > 0
      ? posts.filter(p => !excludedIds.has(p.user_id))
      : posts;

    const hasMore = filteredPosts.length > limit;
    const resultPosts = hasMore ? filteredPosts.slice(0, limit) : filteredPosts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    // Enrich with profile data, tags, comment counts, likes, and images
    const enriched = await enrichPostsWithProfiles(resultPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const mapped = withImages.map(mapPost);

    res.json({ posts: mapped, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/posts/following - Feed of posts from followed users (auth required)
router.get('/following', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const cursor = req.query.cursor || null;

    // Get list of users the current user follows
    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', req.userId);

    if (followError) throw followError;

    if (!follows || follows.length === 0) {
      return res.json({ posts: [], nextCursor: null, hasMore: false });
    }

    const followingIds = follows.map(f => f.following_id);

    let query = supabase
      .from('posts')
      .select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
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

    // Filter out posts from blocked and muted users
    const excludedIds = await getExcludedUserIds(req.userId);
    const filteredPosts = excludedIds.size > 0
      ? posts.filter(p => !excludedIds.has(p.user_id))
      : posts;

    const hasMore = filteredPosts.length > limit;
    const resultPosts = hasMore ? filteredPosts.slice(0, limit) : filteredPosts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    const enriched = await enrichPostsWithProfiles(resultPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const mapped = withImages.map(mapPost);

    res.json({ posts: mapped, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching following feed:', error);
    res.status(500).json({ error: 'Failed to fetch following feed.' });
  }
});

// GET /api/posts/user/:userId - get posts by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 50);
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const enriched = await enrichPostsWithProfiles(posts || []);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const mapped = withCounts.map(mapPost);

    res.json({ posts: mapped });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
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
    const [enriched] = await enrichPostsWithProfiles([post]);
    const [withTags] = await enrichPostsWithTags([enriched]);
    const [withCount] = await enrichPostsWithCommentCounts([withTags]);
    const [withImages] = await enrichPostsWithImages([withCount]);
    res.json(mapPost(withImages));
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts - create post with image upload (auth required)
// Future: gate to creator+ with requireMinRole('creator') after requireAuth
router.post('/', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    // Support both multi-image (images) and legacy single-image (image) uploads
    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ error: 'At least one image or video is required' });
    }

    // Validate video constraints
    const videoFiles = files.filter(f => f.mimetype.startsWith('video/'));
    if (videoFiles.length > 1) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ error: 'Only one video per post is allowed.' });
    }
    if (videoFiles.length > 0 && files.length > 1) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ error: 'A video post cannot include other media.' });
    }
    for (const file of videoFiles) {
      if (file.size > 50 * 1024 * 1024) {
        files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
        return res.status(400).json({ error: 'Video files must be under 50MB (max ~20 seconds).' });
      }
    }

    // Process uploaded files — compress images to 720p, videos to 720p
    const mediaPaths = [];
    let detectedMediaType = 'image';

    for (const file of files) {
      if (file.mimetype.startsWith('video/')) {
        // Video file — compress to 720p MP4
        detectedMediaType = 'video';
        const compressedFilename = `${uuidv4()}.mp4`;
        const compressedPath = path.join(uploadsDir, compressedFilename);
        try {
          await compressVideo(file.path, compressedPath);
          fs.unlinkSync(file.path); // Remove original
          mediaPaths.push(`/uploads/${compressedFilename}`);
        } catch (ffmpegErr) {
          console.error('Video compression failed, using original:', ffmpegErr.message);
          mediaPaths.push(`/uploads/${file.filename}`);
        }
      } else {
        // Image file — compress to 720p JPEG
        const optimizedFilename = `${uuidv4()}.jpg`;
        const optimizedPath = path.join(uploadsDir, optimizedFilename);
        try {
          await sharp(file.path)
            .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(optimizedPath);
          fs.unlinkSync(file.path);
        } catch (sharpErr) {
          console.error('Image compression failed, using original:', sharpErr.message);
        }
        const finalFilename = fs.existsSync(optimizedPath) ? optimizedFilename : file.filename;
        mediaPaths.push(`/uploads/${finalFilename}`);
      }
    }

    const caption = (req.body.caption || '').slice(0, 500);
    const now = new Date().toISOString();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        caption,
        image_path: mediaPaths[0],
        media_type: detectedMediaType,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert all media into post_images table
    if (mediaPaths.length > 0) {
      const imageRows = mediaPaths.map((imgPath, idx) => ({
        post_id: post.id,
        image_path: imgPath,
        order_index: idx,
      }));
      await supabase.from('post_images').insert(imageRows);
    }

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

// Enrich posts with user profile data (display_name, username, avatar_url)
async function enrichPostsWithProfiles(posts) {
  if (!posts || posts.length === 0) return posts;

  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', userIds);

  const profileMap = {};
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.id] = p;
    }
  }

  return posts.map(post => {
    post._profile = profileMap[post.user_id] || null;
    return post;
  });
}

// Enrich posts with tags (batch fetch for all posts in one query)
async function enrichPostsWithTags(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: postTags, error } = await supabase
    .from('post_tags')
    .select('post_id, tag_id, tags(id, name, type)')
    .in('post_id', postIds);

  if (error) {
    console.error('Error fetching tags for posts:', error);
    return posts.map(post => { post._tags = []; return post; });
  }

  const tagMap = {};
  if (postTags) {
    for (const pt of postTags) {
      if (!tagMap[pt.post_id]) tagMap[pt.post_id] = [];
      if (pt.tags) {
        tagMap[pt.post_id].push(pt.tags);
      }
    }
  }

  return posts.map(post => {
    post._tags = tagMap[post.id] || [];
    return post;
  });
}

// Enrich posts with comment counts
async function enrichPostsWithCommentCounts(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  // Fetch comment counts for all posts in batch
  const countPromises = postIds.map(async (postId) => {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    return { postId, count: count || 0 };
  });

  const counts = await Promise.all(countPromises);
  const countMap = {};
  for (const { postId, count } of counts) {
    countMap[postId] = count;
  }

  return posts.map(post => {
    post._commentCount = countMap[post.id] || 0;
    return post;
  });
}

// Enrich posts with like counts and current user's like status
async function enrichPostsWithLikes(posts, currentUserId) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  // Fetch like counts for all posts
  const countPromises = postIds.map(async (postId) => {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    return { postId, count: count || 0 };
  });

  const counts = await Promise.all(countPromises);
  const likeCountMap = {};
  for (const { postId, count } of counts) {
    likeCountMap[postId] = count;
  }

  // If we have a current user, check which posts they liked
  const likedSet = new Set();
  if (currentUserId) {
    const { data: userLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (userLikes) {
      for (const like of userLikes) {
        likedSet.add(like.post_id);
      }
    }
  }

  return posts.map(post => {
    post._likeCount = likeCountMap[post.id] || 0;
    post._liked = likedSet.has(post.id);
    return post;
  });
}

// Enrich posts with multiple images from post_images table
async function enrichPostsWithImages(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: postImages, error } = await supabase
    .from('post_images')
    .select('post_id, image_path, order_index')
    .in('post_id', postIds)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching post images:', error);
    // Fall back to single image_path
    return posts.map(post => { post._images = [post.image_path]; return post; });
  }

  const imageMap = {};
  if (postImages) {
    for (const img of postImages) {
      if (!imageMap[img.post_id]) imageMap[img.post_id] = [];
      imageMap[img.post_id].push(img.image_path);
    }
  }

  return posts.map(post => {
    post._images = imageMap[post.id] || [post.image_path];
    return post;
  });
}

// Map Supabase snake_case to camelCase for frontend
function mapPost(post) {
  const profile = post._profile || {};
  const images = post._images || [post.image_path];
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    imagePath: images[0],
    images: images,
    mediaType: post.media_type || 'image',
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    editedAt: post.edited_at || null,
    displayName: profile.display_name || null,
    username: profile.username || null,
    avatarUrl: profile.avatar_url || null,
    commentCount: post._commentCount || 0,
    likeCount: post._likeCount || 0,
    liked: post._liked || false,
    tags: (post._tags || []).map(t => ({ id: t.id, name: t.name, type: t.type })),
  };
}

// Get user IDs that should be excluded from feeds (blocked + muted + users who blocked me)
async function getExcludedUserIds(currentUserId) {
  if (!currentUserId) return new Set();

  const [blockedByMe, mutedByMe, blockedMe] = await Promise.all([
    // Users I blocked
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', currentUserId),
    // Users I muted
    supabase.from('user_mutes').select('muted_id').eq('muter_id', currentUserId),
    // Users who blocked me (they shouldn't see my posts, and I shouldn't see theirs)
    supabase.from('user_blocks').select('blocker_id').eq('blocked_id', currentUserId),
  ]);

  const excluded = new Set();
  if (blockedByMe.data) blockedByMe.data.forEach(r => excluded.add(r.blocked_id));
  if (mutedByMe.data) mutedByMe.data.forEach(r => excluded.add(r.muted_id));
  if (blockedMe.data) blockedMe.data.forEach(r => excluded.add(r.blocker_id));
  return excluded;
}

module.exports = router;
