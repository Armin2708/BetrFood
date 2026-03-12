const express = require('express');
const https = require('https');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

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
    // Delete related data
    await supabase.from('user_preferences').delete().eq('user_id', req.userId);
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

    // Delete collections and collection_posts
    const { data: collections } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', req.userId);

    if (collections && collections.length > 0) {
      const collectionIds = collections.map(c => c.id);
      await supabase.from('collection_posts').delete().in('collection_id', collectionIds);
      await supabase.from('collections').delete().eq('user_id', req.userId);
    }

    // Delete user's posts (and their related data)
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
      await supabase.from('recipe_ingredients').delete().in('recipe_id',
        (await supabase.from('recipes').select('id').in('post_id', postIds)).data?.map(r => r.id) || []
      );
      await supabase.from('recipe_steps').delete().in('recipe_id',
        (await supabase.from('recipes').select('id').in('post_id', postIds)).data?.map(r => r.id) || []
      );
      await supabase.from('recipes').delete().in('post_id', postIds);
      await supabase.from('posts').delete().eq('user_id', req.userId);
    }

    // Delete user profile
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', req.userId);

    if (error) throw error;

    // Delete the user from Clerk
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

// GET /api/profiles/:userId - Get public profile by userId
router.get('/:userId', async (req, res) => {
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

    return res.json(formatProfile(data));
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

module.exports = router;
