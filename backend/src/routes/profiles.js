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
const { aggregateUserData } = require('../utils/exportUtils');

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
// Verifies the current password and sends a security notification to the old address.
// Email address creation and verification are handled client-side via Clerk's frontend SDK
// because prepare_verification / attempt_verification are Frontend API methods only.
router.post('/me/email/request', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { newEmail, currentPassword } = req.body;

  if (!newEmail || typeof newEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
    return res.status(400).json({ error: 'Current password is required.' });
  }

  // 1. Verify current password via Clerk Backend API
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

  // 2. Duplicate check
  const oldEmail = await getClerkUserEmail(userId);
  const normalizedNew = newEmail.trim().toLowerCase();
  if (oldEmail && oldEmail.toLowerCase() === normalizedNew) {
    return res.status(400).json({ error: 'This is already your current email address.' });
  }

  // 3. Security notification to old email (fire-and-forget)
  if (oldEmail) {
    sendEmail({
      to: oldEmail,
      subject: 'Security Alert: Email Change Request — BetrFood',
      text: `Hello,\n\nA request was made to change the email address on your BetrFood account to ${normalizedNew}.\n\nIf you made this request, please verify your new address.\n\nIf you did not make this request, please contact support immediately.\n\nThe BetrFood Team`,
      html: `<p>Hello,</p><p>A request was made to change the email address on your BetrFood account to <strong>${normalizedNew}</strong>.</p><p>If you did not make this request, please contact support immediately.</p><p>The BetrFood Team</p>`,
    }).catch((err) => console.error('[EMAIL CHANGE] Security notification failed:', err.message));
  }

  console.log(`[EMAIL CHANGE] Password verified for user ${userId}, client will handle Clerk email flow`);
  res.json({ message: 'Password verified.' });
});

// ── Password Change ────────────────────────────────────────────────────────────

// POST /api/profiles/me/password
// Verifies current password, updates to new password in Clerk, sends confirmation email.
router.post('/me/password', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({ error: 'Current password is required.' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from your current password.' });
  }

  // 1. Verify current password
  let verifyResult;
  try {
    verifyResult = await clerkRequest('POST', `/v1/users/${userId}/verify_password`, { password: currentPassword });
  } catch (err) {
    console.error('[PASSWORD CHANGE] verify_password error:', err.message);
    return res.status(500).json({ error: 'Unable to verify password. Please try again.' });
  }

  if (verifyResult.status !== 200 || !verifyResult.data?.verified) {
    const clerkCode = verifyResult.data?.errors?.[0]?.code || '';
    if (clerkCode === 'form_password_not_enabled') {
      return res.status(400).json({ error: 'Password sign-in is not enabled on this account. Manage your password through your OAuth provider.' });
    }
    return res.status(401).json({ error: 'Incorrect current password.' });
  }

  // 2. Update password in Clerk
  let updateResult;
  try {
    updateResult = await clerkRequest('PATCH', `/v1/users/${userId}`, {
      password: newPassword,
      skip_password_checks: false,
    });
  } catch (err) {
    console.error('[PASSWORD CHANGE] update password error:', err.message);
    return res.status(500).json({ error: 'Failed to update password. Please try again.' });
  }

  if (updateResult.status !== 200) {
    const errMsg = updateResult.data?.errors?.[0]?.long_message
      || updateResult.data?.errors?.[0]?.message
      || 'Failed to update password.';
    return res.status(400).json({ error: errMsg });
  }

  // 3. Send confirmation email (fire-and-forget)
  getClerkUserEmail(userId).then((userEmail) => {
    if (!userEmail) return;
    sendEmail({
      to: userEmail,
      subject: 'Your BetrFood password has been changed',
      text: `Hello,\n\nYour BetrFood account password was successfully changed.\n\nIf you did not make this change, please contact support immediately and reset your password.\n\nThe BetrFood Team`,
      html: `<p>Hello,</p><p>Your BetrFood account password was successfully changed.</p><p>If you did not make this change, please contact support immediately and reset your password.</p><p>The BetrFood Team</p>`,
    }).catch((err) => console.error('[PASSWORD CHANGE] Confirmation email failed:', err.message));
  }).catch(() => {});

  console.log(`[PASSWORD CHANGE] Password updated for user ${userId}`);
  res.json({ message: 'Password updated successfully.' });
});

// ── Data Export ────────────────────────────────────────────────────────────────

// POST /api/profiles/me/export
// Aggregates user data, uploads to Supabase Storage, returns a signed download
// URL, and sends the link to the user's email address.
router.post('/me/export', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const exportId = uuidv4();

    // 1. Aggregate all user data
    const userData = await aggregateUserData(userId);

    // 2. Upload JSON to Supabase Storage
    const filename = `exports/${userId}/${exportId}.json`;
    const fileBuffer = Buffer.from(JSON.stringify(userData, null, 2), 'utf8');

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filename, fileBuffer, { contentType: 'application/json', upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 3. Generate signed URL valid for 24 hours
    const expiresInSeconds = 60 * 60 * 24;
    const { data: signedData, error: signedError } = await supabase.storage
      .from('post-media')
      .createSignedUrl(filename, expiresInSeconds);

    if (signedError) throw new Error(`Failed to create signed URL: ${signedError.message}`);

    const downloadUrl = signedData.signedUrl;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Send email notification (fire-and-forget)
    getClerkUserEmail(userId)
      .then((email) => {
        if (!email) return;
        const expiresDate = new Date(expiresAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        return sendEmail({
          to: email,
          subject: 'Your BetrFood Data Export is Ready',
          text: [
            'Your BetrFood data export is ready for download.',
            '',
            `Download link: ${downloadUrl}`,
            '',
            `This link expires on ${expiresDate}.`,
            '',
            'Your export includes your profile, posts, recipes, pantry, collections, likes, comments, and follow relationships in JSON format.',
            '',
            'The BetrFood Team',
          ].join('\n'),
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0F172A;margin-bottom:8px">Your data export is ready</h2>
              <p style="color:#64748B;margin-bottom:24px">
                Your BetrFood data export has been generated. Click the button below to download your data.
              </p>
              <a href="${downloadUrl}"
                 style="display:inline-block;background:#22C55E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
                Download My Data
              </a>
              <p style="color:#94A3B8;font-size:13px;margin-top:20px">
                This link expires on ${expiresDate}. Your export includes your profile, posts, recipes,
                pantry items, collections, likes, comments, and follow relationships in JSON format.
              </p>
              <p style="color:#CBD5E1;font-size:12px;margin-top:16px">
                You received this email because you requested a data export from BetrFood.
              </p>
            </div>`,
        });
      })
      .catch((err) => console.error('[EXPORT] Email notification failed:', err.message));

    console.log(`[EXPORT] Generated export ${exportId} for user ${userId}`);
    res.json({ status: 'ready', downloadUrl, expiresAt });
  } catch (error) {
    console.error('[EXPORT] Error generating data export:', error);
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
