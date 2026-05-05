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
    const extOk = ext ? allowed.test(ext) : true;
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp, heif, heic) are allowed'));
    }
  },
});

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const { sendEmail } = require('../utils/email');

/**
 * Generic Clerk Backend API request helper.
 */
function clerkRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': 'Bearer ' + CLERK_SECRET_KEY,
      'Content-Type': 'application/json',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request({ hostname: 'api.clerk.com', path, method, headers }, (res) => {
      let b = '';
      res.on('data', (chunk) => (b += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

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

/**
 * Fetch user email from Clerk API.
 */
function getClerkUserEmail(userId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.clerk.com',
      path: '/v1/users/' + userId,
      method: 'GET',
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
          const data = JSON.parse(b);
          const primary = data.email_addresses?.find(e => e.id === data.primary_email_address_id);
          resolve(primary?.email_address || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
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

    const optimizedFilename = `${uuidv4()}.jpg`;
    const optimizedPath = path.join(uploadsDir, optimizedFilename);
    try {
      await sharp(req.file.path)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(optimizedPath);
      fs.unlinkSync(req.file.path);
    } catch (sharpErr) {
      console.error('Sharp optimization failed, using original:', sharpErr.message);
      fs.renameSync(req.file.path, optimizedPath);
    }

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(optimizedPath);
    const storageFilename = `avatars/${optimizedFilename}`;
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(storageFilename, fileBuffer, { contentType: 'image/jpeg', upsert: false });

    fs.unlinkSync(optimizedPath);

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(storageFilename);

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.userId, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

// POST /api/profiles/me/complete-onboarding
router.post('/me/complete-onboarding', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.userId, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
});

// ── Email Change ───────────────────────────────────────────────────────────────

// POST /api/profiles/me/email/request
// Step 1: verify current password, add new unverified email to Clerk (triggers
// verification email via Clerk), send security notification to old address.
router.post('/me/email/request', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { newEmail, currentPassword } = req.body;

  if (!newEmail || typeof newEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
    return res.status(400).json({ error: 'Current password is required.' });
  }

  // 1. Verify current password via Clerk
  let verifyResult;
  try {
    verifyResult = await clerkRequest('POST', `/v1/users/${userId}/verify_password`, { password: currentPassword });
  } catch (err) {
    console.error('[EMAIL CHANGE] verify_password error:', err.message);
    return res.status(500).json({ error: 'Unable to verify password. Please try again.' });
  }

  if (verifyResult.status !== 200 || !verifyResult.data?.verified) {
    const clerkCode = verifyResult.data?.errors?.[0]?.code || '';
    if (clerkCode === 'form_password_not_enabled') {
      return res.status(400).json({ error: 'Password sign-in is not enabled on this account. Change your email through your OAuth provider.' });
    }
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  // 2. Fetch current email for notification and duplicate check
  const oldEmail = await getClerkUserEmail(userId);
  const normalizedNew = newEmail.trim().toLowerCase();
  if (oldEmail && oldEmail.toLowerCase() === normalizedNew) {
    return res.status(400).json({ error: 'This is already your current email address.' });
  }

  // 3. Create unverified email address in Clerk
  let createResult;
  try {
    createResult = await clerkRequest('POST', '/v1/email_addresses', {
      user_id: userId,
      email_address: normalizedNew,
      verified: false,
      primary: false,
    });
  } catch (err) {
    console.error('[EMAIL CHANGE] create email_address error:', err.message);
    return res.status(500).json({ error: 'Failed to register new email address.' });
  }

  if (createResult.status !== 200) {
    const errMsg = createResult.data?.errors?.[0]?.long_message
      || createResult.data?.errors?.[0]?.message
      || 'Failed to add email address.';
    return res.status(400).json({ error: errMsg });
  }

  const emailAddressId = createResult.data.id;

  // 4. Prepare verification — Clerk sends a 6-digit code to the new address
  let prepareResult;
  try {
    prepareResult = await clerkRequest('POST', `/v1/email_addresses/${emailAddressId}/prepare_verification`, {
      strategy: 'email_code',
    });
  } catch (err) {
    console.error('[EMAIL CHANGE] prepare_verification error:', err.message);
    await clerkRequest('DELETE', `/v1/email_addresses/${emailAddressId}`).catch(() => {});
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }

  if (prepareResult.status !== 200) {
    await clerkRequest('DELETE', `/v1/email_addresses/${emailAddressId}`).catch(() => {});
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }

  // 5. Security notification to old email (fire-and-forget)
  if (oldEmail) {
    sendEmail({
      to: oldEmail,
      subject: 'Security Alert: Email Change Request — BetrFood',
      text: `Hello,\n\nA request was made to change the email address on your BetrFood account to ${normalizedNew}.\n\nIf you made this request, please verify your new address using the code we sent to ${normalizedNew}.\n\nIf you did not make this request, please contact support immediately.\n\nThe BetrFood Team`,
      html: `<p>Hello,</p><p>A request was made to change the email address on your BetrFood account to <strong>${normalizedNew}</strong>.</p><p>If you made this request, please verify your new address using the code we sent to <strong>${normalizedNew}</strong>.</p><p>If you did not make this request, please contact support immediately.</p><p>The BetrFood Team</p>`,
    }).catch((err) => console.error('[EMAIL CHANGE] Security notification failed:', err.message));
  }

  console.log(`[EMAIL CHANGE] Verification code sent for user ${userId} → ${normalizedNew}`);
  res.json({ emailAddressId, message: 'Verification code sent to your new email address.' });
});

// POST /api/profiles/me/email/confirm
// Step 2: attempt code verification, set new email as primary, remove old addresses.
router.post('/me/email/confirm', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { emailAddressId, code } = req.body;

  if (!emailAddressId || typeof emailAddressId !== 'string') {
    return res.status(400).json({ error: 'emailAddressId is required.' });
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Verification code is required.' });
  }

  // 1. Attempt verification
  let attemptResult;
  try {
    attemptResult = await clerkRequest('POST', `/v1/email_addresses/${emailAddressId}/attempt_verification`, {
      code: code.trim(),
    });
  } catch (err) {
    console.error('[EMAIL CHANGE] attempt_verification error:', err.message);
    return res.status(500).json({ error: 'Unable to verify code. Please try again.' });
  }

  if (attemptResult.status !== 200 || attemptResult.data?.verification?.status !== 'verified') {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  // 2. Set new address as primary
  let updateResult;
  try {
    updateResult = await clerkRequest('PATCH', `/v1/users/${userId}`, {
      primary_email_address_id: emailAddressId,
    });
  } catch (err) {
    console.error('[EMAIL CHANGE] set primary error:', err.message);
    return res.status(500).json({ error: 'Email verified but failed to set as primary. Please contact support.' });
  }

  if (updateResult.status !== 200) {
    return res.status(500).json({ error: 'Email verified but failed to set as primary. Please contact support.' });
  }

  // 3. Remove old email addresses (best-effort)
  clerkRequest('GET', `/v1/users/${userId}`).then((userResult) => {
    if (userResult.status !== 200) return;
    const addresses = userResult.data.email_addresses || [];
    for (const addr of addresses) {
      if (addr.id !== emailAddressId) {
        clerkRequest('DELETE', `/v1/email_addresses/${addr.id}`).catch(() => {});
      }
    }
  }).catch(() => {});

  console.log(`[EMAIL CHANGE] Email updated for user ${userId}`);
  res.json({ message: 'Email address updated successfully.' });
});

// ── Data Export ────────────────────────────────────────────────────────────────

/**
 * Aggregate all data for a user into a JSON object.
 */
async function aggregateUserData(userId) {
  const [
    profileResult,
    prefsResult,
    postsResult,
    pantryResult,
    collectionsResult,
    likesResult,
    commentsResult,
    followersResult,
    followingResult,
  ] = await Promise.allSettled([
    supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('posts').select('*, recipes(*, recipe_ingredients(*), recipe_steps(*)), post_tags(tags(*)), post_images(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('pantry_items').select('*').eq('user_id', userId),
    supabase.from('collections').select('*, collection_posts(post_id)').eq('user_id', userId),
    supabase.from('likes').select('post_id, created_at').eq('user_id', userId),
    supabase.from('comments').select('id, post_id, content, created_at').eq('user_id', userId),
    supabase.from('user_follows').select('follower_id').eq('following_id', userId),
    supabase.from('user_follows').select('following_id').eq('follower_id', userId),
  ]);

  const get = (result) => result.status === 'fulfilled' ? (result.value.data || null) : null;

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    profile: get(profileResult),
    preferences: get(prefsResult),
    posts: get(postsResult) || [],
    pantry: get(pantryResult) || [],
    collections: get(collectionsResult) || [],
    likes: get(likesResult) || [],
    comments: get(commentsResult) || [],
    followers: (get(followersResult) || []).map(f => f.follower_id),
    following: (get(followingResult) || []).map(f => f.following_id),
  };
}

// POST /api/profiles/me/export
// Synchronously aggregates user data, uploads to Supabase Storage,
// and returns a signed download URL immediately.
router.post('/me/export', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const exportId = uuidv4();

    // Aggregate all user data
    const userData = await aggregateUserData(userId);

    // Upload JSON to Supabase Storage
    const filename = `exports/${userId}/${exportId}.json`;
    const fileBuffer = Buffer.from(JSON.stringify(userData, null, 2), 'utf8');

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filename, fileBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Generate signed URL valid for 24 hours
    const expiresInSeconds = 60 * 60 * 24;
    const { data: signedData, error: signedError } = await supabase.storage
      .from('post-media')
      .createSignedUrl(filename, expiresInSeconds);

    if (signedError) throw new Error(`Failed to create signed URL: ${signedError.message}`);

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    res.json({
      status: 'ready',
      downloadUrl: signedData.signedUrl,
      expiresAt,
    });
  } catch (error) {
    console.error('Error generating data export:', error);
    res.status(500).json({ error: 'Failed to generate data export.' });
  }
});

// GET /api/profiles/search?q=term
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q}%`;

    // Fetch users matching the query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, bio, verified')
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(40); // fetch extra to allow for filtering below

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ users: [] });
    }

    // Fetch searchable preferences for matched users
    const userIds = data.map(u => u.id);
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, searchable')
      .in('user_id', userIds);

    // Build a set of opted-out user IDs
    // Users with no preferences row default to searchable = true
    const optedOut = new Set(
      (prefs || [])
        .filter(p => p.searchable === false)
        .map(p => p.user_id)
    );

    // Always include the requesting user's own profile in results
    // (so they can find themselves even if they opted out)
    const filtered = data.filter(u =>
      !optedOut.has(u.id) || u.id === req.userId
    );

    const users = filtered.slice(0, 20).map(u => ({
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

// GET /api/profiles/:userId
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

    if (req.userId === req.params.userId) {
      return res.json(formatProfile(data));
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('profile_visibility, dietary_info_visible')
      .eq('user_id', req.params.userId)
      .maybeSingle();

    if (prefs && prefs.profile_visibility === 'private') {
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
module.exports.getClerkUserEmail = getClerkUserEmail;
