const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  enrichPostsWithProfiles,
  enrichPostsWithTags,
  enrichPostsWithCommentCounts,
  enrichPostsWithLikes,
  enrichPostsWithImages,
  enrichPostsWithRecipes,
  mapPost,
  getExcludedUserIds,
} = require('../utils/enrichment');
const {
  calculatePostRelevanceScore,
  getUserPreferenceVector,
} = require('../utils/recommendationEngine');
const {
  getNegativeFeedbackPostIds,
} = require('../db/interactions');

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
// Upload a local file to Supabase Storage and return its public URL
async function uploadToSupabaseStorage(localPath, filename, mimeType) {
  const fileBuffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage
    .from('post-media')
    .upload(filename, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from('post-media')
    .getPublicUrl(filename);
  return publicUrl;
}

// Delete a file from Supabase Storage by its public URL or path
async function deleteFromSupabaseStorage(urlOrPath) {
  try {
    // Extract filename from full URL or path
    let filename = urlOrPath;
    if (urlOrPath.includes('/post-media/')) {
      filename = urlOrPath.split('/post-media/').pop();
    } else if (urlOrPath.startsWith('/uploads/')) {
      // Legacy local path — nothing to delete from storage
      return;
    }
    await supabase.storage.from('post-media').remove([filename]);
  } catch (err) {
    console.error('Failed to delete from Supabase Storage:', err.message);
  }
}
const { requireRole, requireMinRole } = require('../middleware/rbac');

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
    let filteredPosts = excludedIds.size > 0
      ? posts.filter(p => !excludedIds.has(p.user_id))
      : posts;

    // Filter out posts from private profiles that the current user does not follow
    if (filteredPosts.length > 0) {
      // Get all unique user IDs from posts
      const postUserIds = [...new Set(filteredPosts.map(p => p.user_id))];

      // Find which of these users have private profiles
      const { data: privatePrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('user_id', postUserIds)
        .eq('profile_visibility', 'private');

      const privateUserIds = new Set((privatePrefs || []).map(p => p.user_id));

      if (privateUserIds.size > 0) {
        // Get the list of users the current user follows (if authenticated)
        let followingIds = new Set();
        if (req.userId) {
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', req.userId)
            .in('following_id', [...privateUserIds]);
          followingIds = new Set((follows || []).map(f => f.following_id));
        }

        // Exclude posts from private users not followed by the current user (also allow own posts)
        filteredPosts = filteredPosts.filter(p => {
          if (!privateUserIds.has(p.user_id)) return true;
          if (p.user_id === req.userId) return true;
          return followingIds.has(p.user_id);
        });
      }
    }

    const hasMore = filteredPosts.length > limit;
    const resultPosts = hasMore ? filteredPosts.slice(0, limit) : filteredPosts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    // Enrich with profile data, tags, comment counts, likes, images, and recipes
    const enriched = await enrichPostsWithProfiles(resultPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const withRecipes = await enrichPostsWithRecipes(withImages);
    const mapped = withRecipes.map(mapPost);

    // Apply recommendation scoring for authenticated users
    let finalPosts = mapped;
    if (req.userId && mapped.length > 0) {
      try {
        // Get user's preference vector
        const userPrefVector = await getUserPreferenceVector(req.userId);

        // Get posts user marked as "not interested"
        const notInterestedPostIds = await getNegativeFeedbackPostIds(req.userId);
        const notInterestedSet = new Set(notInterestedPostIds);

        // Score each post
        finalPosts = mapped.map(post => ({
          ...post,
          recommendationScore: calculatePostRelevanceScore(
            {
              ...post,
              hasNegativeFeedback: notInterestedSet.has(post.id),
            },
            userPrefVector
          ),
        }));

        // Sort by recommendation score (descending), then by recency as tiebreaker
        finalPosts.sort((a, b) => {
          if (Math.abs(a.recommendationScore - b.recommendationScore) > 0.01) {
            return b.recommendationScore - a.recommendationScore;
          }
          // Same score - use recency as tiebreaker
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Remove recommendation score from response (internal use only)
        finalPosts = finalPosts.map(({ recommendationScore, ...post }) => post);
      } catch (err) {
        console.warn('Recommendation scoring failed, falling back to chronological:', err.message);
        // On error, fall back to chronological
      }
    }

    res.json({ posts: finalPosts, nextCursor, hasMore });
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
    const withRecipes = await enrichPostsWithRecipes(withImages);
    const mapped = withRecipes.map(mapPost);

    res.json({ posts: mapped, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching following feed:', error);
    res.status(500).json({ error: 'Failed to fetch following feed.' });
  }
});

// GET /api/posts/liked — fetch posts liked by a user
router.get('/liked', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    const { data: likeRows, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .limit(limit);

    if (likesError) throw likesError;
    if (!likeRows || likeRows.length === 0) return res.json({ posts: [] });

    const postIds = likeRows.map(r => r.post_id);

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);

    if (postsError) throw postsError;

    // Preserve like order
    const postMap = new Map((posts || []).map(p => [p.id, p]));
    let ordered = postIds.map(id => postMap.get(id)).filter(Boolean);

    // Enrich
    ordered = await enrichPostsWithProfiles(ordered);
    ordered = await enrichPostsWithTags(ordered);
    ordered = await enrichPostsWithCommentCounts(ordered);
    ordered = await enrichPostsWithLikes(ordered, req.userId);
    ordered = await enrichPostsWithImages(ordered);
    ordered = await enrichPostsWithRecipes(ordered);

    res.json({ posts: ordered.map(mapPost) });
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    res.status(500).json({ error: 'Failed to fetch liked posts.' });
  }
});

// GET /api/posts/user/:userId - get posts by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 50);

    // Check if the requesting user has blocked or been blocked by the target user
    const excludedIds = req.userId ? await getExcludedUserIds(req.userId) : new Set();
    if (excludedIds.has(req.params.userId)) {
      return res.json({ posts: [] });
    }

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
    const withRecipes = await enrichPostsWithRecipes(withCounts);
    const mapped = withRecipes.map(mapPost);

    res.json({ posts: mapped });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
  }
});

// GET /api/posts/:id - single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    // Check block status
    if (req.userId) {
      const excludedIds = await getExcludedUserIds(req.userId);
      if (excludedIds.has(post.user_id)) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }

    const [enriched] = await enrichPostsWithProfiles([post]);
    const [withTags] = await enrichPostsWithTags([enriched]);
    const [withCount] = await enrichPostsWithCommentCounts([withTags]);
    const [withImages] = await enrichPostsWithImages([withCount]);
    const [withRecipe] = await enrichPostsWithRecipes([withImages]);
    res.json(mapPost(withRecipe));
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts - create post with image upload (auth required)
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

    // Process uploaded files — compress images to 720p, videos to 720p, then upload to Supabase Storage
    const mediaPaths = [];
    let detectedMediaType = 'image';

    for (const file of files) {
      if (file.mimetype.startsWith('video/')) {
        detectedMediaType = 'video';
        const compressedFilename = `${uuidv4()}.mp4`;
        const compressedPath = path.join(uploadsDir, compressedFilename);
        try {
          await compressVideo(file.path, compressedPath);
          fs.unlinkSync(file.path);
          const publicUrl = await uploadToSupabaseStorage(compressedPath, compressedFilename, 'video/mp4');
          fs.unlinkSync(compressedPath);
          mediaPaths.push(publicUrl);
        } catch (err) {
          console.error('Video processing/upload failed:', err.message);
          // Fallback: try uploading original
          try {
            const publicUrl = await uploadToSupabaseStorage(file.path, file.filename, file.mimetype);
            fs.unlinkSync(file.path);
            mediaPaths.push(publicUrl);
          } catch (uploadErr) {
            console.error('Fallback upload also failed:', uploadErr.message);
            try { fs.unlinkSync(file.path); } catch {}
          }
        }
      } else {
        const optimizedFilename = `${uuidv4()}.jpg`;
        const optimizedPath = path.join(uploadsDir, optimizedFilename);
        let uploadPath = file.path;
        let uploadFilename = file.filename;
        let uploadMime = file.mimetype;
        try {
          await sharp(file.path)
            .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(optimizedPath);
          fs.unlinkSync(file.path);
          uploadPath = optimizedPath;
          uploadFilename = optimizedFilename;
          uploadMime = 'image/jpeg';
        } catch (sharpErr) {
          console.error('Image compression failed, using original:', sharpErr.message);
        }
        try {
          const publicUrl = await uploadToSupabaseStorage(uploadPath, uploadFilename, uploadMime);
          fs.unlinkSync(uploadPath);
          mediaPaths.push(publicUrl);
        } catch (uploadErr) {
          console.error('Image upload to Supabase Storage failed:', uploadErr.message);
          try { fs.unlinkSync(uploadPath); } catch {}
        }
      }
    }

    if (mediaPaths.length === 0) {
      return res.status(500).json({ error: 'Failed to upload media files.' });
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

// DELETE /api/posts/:id - delete post (owner or moderator+, auth required)
router.delete('/:id', requireAuth, requireMinRole('user'), async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    const isModerator = ['moderator', 'admin'].includes(req.userRole);
    if (post.user_id !== req.userId && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Clean up all media files from Supabase Storage (and legacy local files)
    const { data: postImages } = await supabase
      .from('post_images')
      .select('image_path')
      .eq('post_id', req.params.id);

    const mediaPaths = new Set();
    if (postImages) {
      for (const img of postImages) {
        if (img.image_path) mediaPaths.add(img.image_path);
      }
    }
    if (post.image_path) mediaPaths.add(post.image_path);

    for (const mediaPath of mediaPaths) {
      if (mediaPath.startsWith('http')) {
        // Supabase Storage URL
        await deleteFromSupabaseStorage(mediaPath);
      } else {
        // Legacy local file
        const fullPath = path.join(__dirname, '..', '..', mediaPath);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch {}
        }
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

module.exports = router;
