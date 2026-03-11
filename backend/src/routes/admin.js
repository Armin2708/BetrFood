const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireMinRole, ROLE_HIERARCHY } = require('../middleware/rbac');

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

/**
 * GET /api/admin/users
 * List all user profiles with pagination. Accessible by moderators and admins.
 * Query params: limit (default 20), offset (default 0), role (optional filter)
 */
router.get('/users', requireMinRole('moderator'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const roleFilter = req.query.role;

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roleFilter && ROLE_HIERARCHY.includes(roleFilter)) {
      query = query.eq('role', roleFilter);
    }

    const { data: users, error, count } = await query;
    if (error) throw error;

    res.json({
      users: users || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

/**
 * PUT /api/admin/users/:userId/role
 * Change a user's role. Admin only.
 * Body: { role: 'user' | 'creator' | 'moderator' | 'admin' }
 */
router.put('/users/:userId/role', requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !ROLE_HIERARCHY.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${ROLE_HIERARCHY.join(', ')}`,
      });
    }

    // Prevent admin from demoting themselves
    if (userId === req.userId) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    // Check the target user exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Update the role
    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updated);
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

/**
 * GET /api/admin/stats
 * Get basic platform stats. Accessible by moderators and admins.
 * Returns: total users, total posts, users by role counts.
 */
router.get('/stats', requireMinRole('moderator'), async (req, res) => {
  try {
    // Total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Total posts
    const { count: totalPosts, error: postsError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (postsError) throw postsError;

    // Users by role
    const roleCountPromises = ROLE_HIERARCHY.map(async (role) => {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (error) throw error;
      return { role, count: count || 0 };
    });

    const roleCounts = await Promise.all(roleCountPromises);
    const usersByRole = {};
    for (const { role, count } of roleCounts) {
      usersByRole[role] = count;
    }

    res.json({
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      usersByRole,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch platform stats.' });
  }
});

/**
 * PATCH /api/admin/users/:userId/verify
 * Set a user's verified status. Admin only.
 * Body: { verified: true | false }
 */
router.patch('/users/:userId/verify', requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'Field "verified" must be a boolean.' });
    }

    // Check the target user exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update({ verified, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updated);
  } catch (err) {
    console.error('Error updating user verified status:', err);
    res.status(500).json({ error: 'Failed to update user verified status.' });
  }
});

module.exports = router;
