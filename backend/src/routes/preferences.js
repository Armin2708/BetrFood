const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// Granular per-type notification preference keys (camelCase <-> snake_case).
// Source of truth for both GET serialization and PATCH validation. See #114.
const NOTIFICATION_TYPE_KEYS = [
  { api: 'notifNewFollower', db: 'notif_new_follower' },
  { api: 'notifLikes', db: 'notif_likes' },
  { api: 'notifComments', db: 'notif_comments' },
  { api: 'notifCommentReplies', db: 'notif_comment_replies' },
  { api: 'notifAiChat', db: 'notif_ai_chat' },
  { api: 'notifWeeklyDigest', db: 'notif_weekly_digest' },
];

function buildNotificationPayload(row) {
  const payload = {
    notificationsEnabled: row?.notifications_enabled ?? true,
    expirationNotificationsEnabled: row?.expiration_notifications_enabled ?? false,
  };
  for (const { api, db } of NOTIFICATION_TYPE_KEYS) {
    payload[api] = row?.[db] ?? true;
  }
  return payload;
}

// GET /api/preferences - Get user preferences (auth required)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({
        userId: req.userId,
        dietaryPreferences: [],
        allergies: [],
        cuisines: [],
        profileVisibility: 'public',
        dietaryInfoVisible: true,
        cookingSkill: 'beginner',
        maxCookTime: null,
        expiringItemsThreshold: 7,
        expirationNotificationsEnabled: false,
        notificationsEnabled: true,
        notifNewFollower: true,
        notifLikes: true,
        notifComments: true,
        notifCommentReplies: true,
        notifAiChat: true,
        notifWeeklyDigest: true,
        textSizeScale: 'default'
      });
    }

    // Normalize allergies to string array for frontend compatibility
    const allergies = Array.isArray(data.allergies)
      ? data.allergies.map(a => typeof a === 'object' ? a.name : a)
      : [];

    res.json({
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      allergies,
      cuisines: data.cuisines || [],
      profileVisibility: data.profile_visibility || 'public',
      dietaryInfoVisible: data.dietary_info_visible !== false,
      cookingSkill: data.cooking_skill || 'beginner',
      maxCookTime: data.max_cook_time || null,
      expiringItemsThreshold: data.expiring_items_threshold || 7,
      textSizeScale: data.text_size_scale || 'default',
      ...buildNotificationPayload(data),
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// PUT /api/preferences - Update user preferences (auth required)
router.put('/', requireAuth, async (req, res) => {
  try {
    const { dietaryPreferences, allergies, cuisines, profileVisibility, dietaryInfoVisible, expiringItemsThreshold, expirationNotificationsEnabled, textSizeScale } = req.body;

    const updates = {
      user_id: req.userId,
      updated_at: new Date().toISOString(),
    };

    if (dietaryPreferences !== undefined) {
      if (!Array.isArray(dietaryPreferences)) {
        return res.status(400).json({ error: 'dietaryPreferences must be an array.' });
      }
      updates.dietary_preferences = dietaryPreferences;
    }

    if (allergies !== undefined) {
      if (!Array.isArray(allergies)) {
        return res.status(400).json({ error: 'allergies must be an array.' });
      }
      const validSeverities = ['mild', 'moderate', 'severe'];
      let normalizedAllergies;
      try {
        normalizedAllergies = allergies.map((allergy) => {
          if (typeof allergy === 'string') {
            return { name: allergy, severity: 'moderate' };
          }
          if (typeof allergy !== 'object' || !allergy.name) {
            throw new Error('Each allergy must be a string or an object with a "name" field.');
          }
          if (allergy.severity && !validSeverities.includes(allergy.severity)) {
            throw new Error('Allergy severity must be "mild", "moderate", or "severe".');
          }
          return { ...allergy, severity: allergy.severity || 'moderate' };
        });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      updates.allergies = normalizedAllergies;
    }

    if (cuisines !== undefined) {
      if (!Array.isArray(cuisines)) {
        return res.status(400).json({ error: 'cuisines must be an array.' });
      }
      updates.cuisines = cuisines;
    }

    if (profileVisibility !== undefined) {
      if (!['public', 'private'].includes(profileVisibility)) {
        return res.status(400).json({ error: 'profileVisibility must be "public" or "private".' });
      }
      updates.profile_visibility = profileVisibility;
    }

    if (dietaryInfoVisible !== undefined) {
      if (typeof dietaryInfoVisible !== 'boolean') {
        return res.status(400).json({ error: 'dietaryInfoVisible must be a boolean.' });
      }
      updates.dietary_info_visible = dietaryInfoVisible;
    }

    const { cookingSkill, maxCookTime } = req.body;

    if (cookingSkill !== undefined) {
      if (!['beginner', 'intermediate', 'advanced'].includes(cookingSkill)) {
        return res.status(400).json({ error: 'cookingSkill must be "beginner", "intermediate", or "advanced".' });
      }
      updates.cooking_skill = cookingSkill;
    }

    if (maxCookTime !== undefined) {
      if (maxCookTime !== null && (typeof maxCookTime !== 'number' || maxCookTime < 0)) {
        return res.status(400).json({ error: 'maxCookTime must be a positive number or null.' });
      }
      updates.max_cook_time = maxCookTime;
    }

    if (expiringItemsThreshold !== undefined) {
      if (typeof expiringItemsThreshold !== 'number' || expiringItemsThreshold < 1 || expiringItemsThreshold > 30) {
        return res.status(400).json({ error: 'expiringItemsThreshold must be a number between 1 and 30.' });
      }
      updates.expiring_items_threshold = expiringItemsThreshold;
    }

    if (expirationNotificationsEnabled !== undefined) {
      if (typeof expirationNotificationsEnabled !== 'boolean') {
        return res.status(400).json({ error: 'expirationNotificationsEnabled must be a boolean.' });
      }
      updates.expiration_notifications_enabled = expirationNotificationsEnabled;
    }

    if (textSizeScale !== undefined) {
      const validScales = ['small', 'default', 'large', 'xLarge'];
      if (!validScales.includes(textSizeScale)) {
        return res.status(400).json({ error: 'textSizeScale must be "small", "default", "large", or "xLarge".' });
      }
      updates.text_size_scale = textSizeScale;
    }

    const { notificationsEnabled } = req.body;
    if (notificationsEnabled !== undefined) {
      if (typeof notificationsEnabled !== 'boolean') {
        return res.status(400).json({ error: 'notificationsEnabled must be a boolean.' });
      }
      updates.notifications_enabled = notificationsEnabled;
    }

    for (const { api, db } of NOTIFICATION_TYPE_KEYS) {
      const value = req.body[api];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') {
        return res.status(400).json({ error: `${api} must be a boolean.` });
      }
      updates[db] = value;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    // Normalize allergies to string array for frontend compatibility
    const allergyData = Array.isArray(data.allergies)
      ? data.allergies.map(a => typeof a === 'object' ? a.name : a)
      : [];

    res.json({
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      allergies: allergyData,
      cuisines: data.cuisines || [],
      profileVisibility: data.profile_visibility || 'public',
      dietaryInfoVisible: data.dietary_info_visible !== false,
      cookingSkill: data.cooking_skill || 'beginner',
      maxCookTime: data.max_cook_time || null,
      expiringItemsThreshold: data.expiring_items_threshold || 7,
      textSizeScale: data.text_size_scale || 'default',
      ...buildNotificationPayload(data),
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// GET /api/preferences/notifications - Get notification preferences
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const selectColumns = [
      'notifications_enabled',
      'expiration_notifications_enabled',
      ...NOTIFICATION_TYPE_KEYS.map(({ db }) => db),
    ].join(', ');

    const { data, error } = await supabase
      .from('user_preferences')
      .select(selectColumns)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;

    res.json(buildNotificationPayload(data));
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences.' });
  }
});

// PATCH /api/preferences/notifications - Update notification preferences
router.patch('/notifications', requireAuth, async (req, res) => {
  try {
    const updates = {
      user_id: req.userId,
      updated_at: new Date().toISOString(),
    };

    const { notificationsEnabled, expirationNotificationsEnabled } = req.body;

    if (notificationsEnabled !== undefined) {
      if (typeof notificationsEnabled !== 'boolean') {
        return res.status(400).json({ error: 'notificationsEnabled must be a boolean.' });
      }
      updates.notifications_enabled = notificationsEnabled;
    }

    if (expirationNotificationsEnabled !== undefined) {
      if (typeof expirationNotificationsEnabled !== 'boolean') {
        return res.status(400).json({ error: 'expirationNotificationsEnabled must be a boolean.' });
      }
      updates.expiration_notifications_enabled = expirationNotificationsEnabled;
    }

    for (const { api, db } of NOTIFICATION_TYPE_KEYS) {
      const value = req.body[api];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') {
        return res.status(400).json({ error: `${api} must be a boolean.` });
      }
      updates[db] = value;
    }

    // Require at least one recognized notification field in the body.
    const hasAny = Object.keys(updates).some(
      (key) => key !== 'user_id' && key !== 'updated_at'
    );
    if (!hasAny) {
      return res.status(400).json({ error: 'No notification preference fields provided.' });
    }

    const selectColumns = [
      'notifications_enabled',
      'expiration_notifications_enabled',
      ...NOTIFICATION_TYPE_KEYS.map(({ db }) => db),
    ].join(', ');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updates, { onConflict: 'user_id' })
      .select(selectColumns)
      .single();

    if (error) throw error;

    res.json(buildNotificationPayload(data));
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
});

module.exports = router;
