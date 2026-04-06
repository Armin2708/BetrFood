const express = require('express');
const https = require('https');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const pool = require('../db/pool');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${uuidv4()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heif|heic/;
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = ext ? allowed.test(ext) : true; // no extension OK if MIME matches
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp, heif, heic) are allowed'));
    }
  },
});

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Delete a user from Clerk via Backend API.
 */
function deleteClerkUser(userId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clerk.com',
      path: '/v1/users/' + userId,
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + CLERK_SECRET_KEY,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', (chunk) => (b += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, data: b });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Helper: convert DB row to API response
function formatProfile(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    dietaryPreferences: row.dietary_preferences || [],
    onboardingCompleted: row.onboarding_completed,
    verified: row.verified || false,
  };
}

// Validate username: 3-20 chars, alphanumeric + underscores, lowercase
function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// GET /api/profiles/check-username/:username - Check username availability (public)
router.get('/check-username/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();

    if (!isValidUsername(username)) {
      return res.json({ available: false, reason: 'Username must be 3-20 characters, lowercase alphanumeric and underscores only.' });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;

    return res.json({ available: !data });
  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ error: 'Failed to check username availability.' });
  }
});

// GET /api/profiles/me - Get current user's profile (auto-provisions if missing)
router.get('/me', requireAuth, async (req, res) => {
  console.log('[PROFILE] GET /me for user:', req.userId);
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      console.log('[PROFILE] No profile found, auto-provisioning for:', req.userId);
      // Auto-provision profile for new users (e.g. first OAuth sign-in)
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({ id: req.userId, onboarding_completed: false })
        .select('*')
        .single();

      if (createError) {
        console.error('[PROFILE] ✗ Auto-provision failed:', createError);
        throw createError;
      }
      console.log('[PROFILE] ✓ Auto-provisioned profile:', newProfile.id);
      return res.json(formatProfile(newProfile));
    }

    console.log('[PROFILE] ✓ Found existing profile:', data.id);
    return res.json(formatProfile(data));
  } catch (error) {
    console.error('[PROFILE] ✗ Error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/profiles/me - Update (or create) current user's profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { displayName, username, bio, avatarUrl, dietaryPreferences } = req.body;

    // Build the update object
    const updates = { updated_at: new Date().toISOString() };

    if (displayName !== undefined) updates.display_name = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (dietaryPreferences !== undefined) updates.dietary_preferences = dietaryPreferences;

    if (username !== undefined) {
      const lower = username.toLowerCase();
      if (!isValidUsername(lower)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters, lowercase alphanumeric and underscores only.' });
      }

      // Check uniqueness (exclude current user)
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', lower)
        .neq('id', req.userId)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }

      updates.username = lower;
    }

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.userId, ...updates }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/profiles/me/avatar - Upload avatar image
router.post('/me/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Avatar image is required.' });
    }

    // Optimize: resize to max 400x400, convert to JPEG
    const optimizedFilename = `${uuidv4()}.jpg`;
    const optimizedPath = path.join(uploadsDir, optimizedFilename);
    try {
      await sharp(req.file.path)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(optimizedPath);
      fs.unlinkSync(req.file.path);
    } catch (sharpErr) {
      console.error('Avatar optimization failed, using original:', sharpErr.message);
    }
    const finalFilename = fs.existsSync(optimizedPath) ? optimizedFilename : req.file.filename;
    const avatarUrl = `/uploads/${finalFilename}`;

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.userId, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

// POST /api/profiles/me/complete-onboarding - Mark onboarding complete
router.post('/me/complete-onboarding', requireAuth, async (req, res) => {
  try {
    // Verify the user has a username set
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing || !existing.username) {
      return res.status(400).json({ error: 'Username must be set before completing onboarding.' });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', req.userId)
      .select('*')
      .single();

    if (error) throw error;

    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
});

// DELETE /api/profiles/me - Delete own account (auth required)
router.delete('/me', requireAuth, async (req, res) => {
  try {
    if (pool) {
      // Use pg transaction for atomic account deletion
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userId = req.userId;

        // Delete related data in dependency order
        await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM pantry_items WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM user_follows WHERE follower_id = $1 OR following_id = $1', [userId]);
        await client.query('DELETE FROM user_blocks WHERE blocker_id = $1 OR blocked_id = $1', [userId]);
        await client.query('DELETE FROM user_mutes WHERE muter_id = $1 OR muted_id = $1', [userId]);
        await client.query('DELETE FROM likes WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM reports WHERE reporter_id = $1', [userId]);
        await client.query('DELETE FROM comments WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM notifications WHERE user_id = $1 OR actor_id = $1', [userId]);

        // Delete collections and their posts
        await client.query(`
          DELETE FROM collection_posts WHERE collection_id IN
            (SELECT id FROM collections WHERE user_id = $1)
        `, [userId]);
        await client.query('DELETE FROM collections WHERE user_id = $1', [userId]);

        // Delete post-related data
        const { rows: posts } = await client.query('SELECT id FROM posts WHERE user_id = $1', [userId]);
        if (posts.length > 0) {
          const postIds = posts.map(p => p.id);
          await client.query('DELETE FROM likes WHERE post_id = ANY($1)', [postIds]);
          await client.query('DELETE FROM comments WHERE post_id = ANY($1)', [postIds]);
          await client.query('DELETE FROM collection_posts WHERE post_id = ANY($1)', [postIds]);
          await client.query('DELETE FROM reports WHERE target_id = ANY($1::text[])', [postIds.map(String)]);
          await client.query('DELETE FROM post_tags WHERE post_id = ANY($1)', [postIds]);
          await client.query('DELETE FROM post_images WHERE post_id = ANY($1)', [postIds]);
          await client.query(`
            DELETE FROM recipe_ingredients WHERE recipe_id IN
              (SELECT id FROM recipes WHERE post_id = ANY($1))
          `, [postIds]);
          await client.query(`
            DELETE FROM recipe_steps WHERE recipe_id IN
              (SELECT id FROM recipes WHERE post_id = ANY($1))
          `, [postIds]);
          await client.query('DELETE FROM recipes WHERE post_id = ANY($1)', [postIds]);
          await client.query('DELETE FROM posts WHERE user_id = $1', [userId]);
        }

        // Delete user profile
        await client.query('DELETE FROM user_profiles WHERE id = $1', [userId]);

        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } else {
      // Fallback: sequential deletes via Supabase client (no transaction)
      await supabase.from('user_preferences').delete().eq('user_id', req.userId);
      await supabase.from('pantry_items').delete().eq('user_id', req.userId);
      await supabase.from('user_follows').delete().eq('follower_id', req.userId);
      await supabase.from('user_follows').delete().eq('following_id', req.userId);
      await supabase.from('user_blocks').delete().eq('blocker_id', req.userId);
      await supabase.from('user_blocks').delete().eq('blocked_id', req.userId);
      await supabase.from('user_mutes').delete().eq('muter_id', req.userId);
      await supabase.from('user_mutes').delete().eq('muted_id', req.userId);
      await supabase.from('likes').delete().eq('user_id', req.userId);
      await supabase.from('reports').delete().eq('reporter_id', req.userId);
      await supabase.from('comments').delete().eq('user_id', req.userId);
      await supabase.from('notifications').delete().eq('user_id', req.userId);
      await supabase.from('notifications').delete().eq('actor_id', req.userId);

      const { data: collections } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', req.userId);

      if (collections && collections.length > 0) {
        const collectionIds = collections.map(c => c.id);
        await supabase.from('collection_posts').delete().in('collection_id', collectionIds);
        await supabase.from('collections').delete().eq('user_id', req.userId);
      }

      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', req.userId);

      if (posts && posts.length > 0) {
        const postIds = posts.map(p => p.id);
        await supabase.from('likes').delete().in('post_id', postIds);
        await supabase.from('comments').delete().in('post_id', postIds);
        await supabase.from('collection_posts').delete().in('post_id', postIds);
        await supabase.from('reports').delete().in('post_id', postIds);
        await supabase.from('post_tags').delete().in('post_id', postIds);
        await supabase.from('post_images').delete().in('post_id', postIds);
        await supabase.from('recipe_ingredients').delete().in('recipe_id',
          (await supabase.from('recipes').select('id').in('post_id', postIds)).data?.map(r => r.id) || []
        );
        await supabase.from('recipe_steps').delete().in('recipe_id',
          (await supabase.from('recipes').select('id').in('post_id', postIds)).data?.map(r => r.id) || []
        );
        await supabase.from('recipes').delete().in('post_id', postIds);
        await supabase.from('posts').delete().eq('user_id', req.userId);
      }

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', req.userId);

      if (error) throw error;
    }

    // Delete the user from Clerk (outside transaction — best effort)
    try {
      await deleteClerkUser(req.userId);
    } catch (clerkErr) {
      console.error('Failed to delete Clerk user (profile already deleted):', clerkErr);
    }

    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// GET /api/profiles/search?q=term - Search user profiles by username or display name
// NOTE: Must be defined BEFORE /:userId to avoid "search" matching as :userId
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q}%`;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, bio, verified')
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(20);

    if (error) throw error;

    const users = (data || []).map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      verified: u.verified,
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({ error: 'Failed to search profiles.' });
  }
});

// GET /api/profiles/:userId - Get profile by userId (respects privacy settings)
router.get('/:userId', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.params.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    // If requesting own profile, always return full data
    if (req.userId === req.params.userId) {
      return res.json(formatProfile(data));
    }

    // Check profile visibility preference
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('profile_visibility, dietary_info_visible')
      .eq('user_id', req.params.userId)
      .maybeSingle();

    if (prefs && prefs.profile_visibility === 'private') {
      // Allow followers to see full profile even if private
      let isFollower = false;
      if (req.userId) {
        const { data: followRow } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', req.userId)
          .eq('following_id', req.params.userId)
          .maybeSingle();
        isFollower = !!followRow;
      }

      if (!isFollower) {
        return res.json({
          id: data.id,
          displayName: data.display_name,
          username: data.username,
          avatarUrl: data.avatar_url,
          isPrivate: true,
        });
      }
    }

    // Enforce dietary info visibility — hide from non-followers if disabled
    const profile = formatProfile(data);
    if (prefs && prefs.dietary_info_visible === false) {
      let isFollower = false;
      if (req.userId) {
        const { data: followRow } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', req.userId)
          .eq('following_id', req.params.userId)
          .maybeSingle();
        isFollower = !!followRow;
      }
      if (!isFollower) {
        profile.dietaryPreferences = [];
      }
    }

    return res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

module.exports = router;
