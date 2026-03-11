const supabase = require('../db/supabase');

/**
 * Role hierarchy from lowest to highest privilege.
 */
const ROLE_HIERARCHY = ['user', 'creator', 'moderator', 'admin'];

/**
 * Returns the numeric level for a role in the hierarchy.
 * Unknown roles default to 0 (same as 'user').
 */
function roleLevel(role) {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index >= 0 ? index : 0;
}

/**
 * Fetches the role for a given userId from the user_profiles table.
 * Returns 'user' if the profile does not exist yet.
 */
async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // No profile row yet — default role
    return 'user';
  }
  return data.role || 'user';
}

/**
 * Middleware that checks if the authenticated user has one of the specified roles.
 * Must be used AFTER requireAuth in the middleware chain (req.userId must be set).
 *
 * Usage:
 *   router.get('/admin-only', requireAuth, requireRole('admin'), handler);
 *   router.get('/mod-or-admin', requireAuth, requireRole('moderator', 'admin'), handler);
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userRole = await getUserRole(req.userId);
      req.userRole = userRole; // attach for downstream use

      if (roles.includes(userRole)) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden. Insufficient role.' });
    } catch (err) {
      console.error('RBAC middleware error:', err);
      return res.status(500).json({ error: 'Failed to verify user role.' });
    }
  };
}

/**
 * Middleware that checks if the authenticated user's role is at or above a minimum level.
 * Hierarchy: admin > moderator > creator > user
 *
 * Usage:
 *   router.get('/creators-plus', requireAuth, requireMinRole('creator'), handler);
 */
function requireMinRole(minRole) {
  return async (req, res, next) => {
    try {
      const userRole = await getUserRole(req.userId);
      req.userRole = userRole; // attach for downstream use

      if (roleLevel(userRole) >= roleLevel(minRole)) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden. Insufficient role.' });
    } catch (err) {
      console.error('RBAC middleware error:', err);
      return res.status(500).json({ error: 'Failed to verify user role.' });
    }
  };
}

module.exports = { requireRole, requireMinRole, getUserRole, ROLE_HIERARCHY };
