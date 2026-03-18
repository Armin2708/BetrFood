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
        cookingSkill: 'beginner',
        maxCookTime: null,
        expiringItemsThreshold: 7,
      });
    }

    res.json({
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      allergies: data.allergies || [],
      cuisines: data.cuisines || [],
      profileVisibility: data.profile_visibility || 'public',
      dietaryInfoVisible: data.dietary_info_visible !== false,
      cookingSkill: data.cooking_skill || 'beginner',
      maxCookTime: data.max_cook_time || null,
      expiringItemsThreshold: data.expiring_items_threshold || 7,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// PUT /api/preferences - Update user preferences (auth required)
router.put('/', requireAuth, async (req, res) => {
  try {
    const { dietaryPreferences, allergies, cuisines, profileVisibility, dietaryInfoVisible, expiringItemsThreshold } = req.body;

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
      for (const allergy of allergies) {
        if (typeof allergy !== 'object' || !allergy.name) {
          return res.status(400).json({ error: 'Each allergy must be an object with a "name" field.' });
        }
        if (allergy.severity && !validSeverities.includes(allergy.severity)) {
          return res.status(400).json({ error: 'Allergy severity must be "mild", "moderate", or "severe".' });
        }
        if (!allergy.severity) {
          allergy.severity = 'moderate';
        }
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
      cookingSkill: data.cooking_skill || 'beginner',
      maxCookTime: data.max_cook_time || null,
      expiringItemsThreshold: data.expiring_items_threshold || 7,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

module.exports = router;
