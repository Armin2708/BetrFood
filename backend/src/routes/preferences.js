const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

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
      });
    }

    res.json({
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      allergies: data.allergies || [],
      cuisines: data.cuisines || [],
      profileVisibility: data.profile_visibility || 'public',
      dietaryInfoVisible: data.dietary_info_visible !== false,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// PUT /api/preferences - Update user preferences (auth required)
router.put('/', requireAuth, async (req, res) => {
  try {
    const { dietaryPreferences, allergies, cuisines, profileVisibility, dietaryInfoVisible } = req.body;

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
      updates.allergies = allergies;
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

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      allergies: data.allergies || [],
      cuisines: data.cuisines || [],
      profileVisibility: data.profile_visibility || 'public',
      dietaryInfoVisible: data.dietary_info_visible !== false,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

module.exports = router;
