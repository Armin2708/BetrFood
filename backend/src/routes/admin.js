const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Admin-only middleware ─────────────────────────────────────────────────────
async function requireAdmin(req, res, next) {
  const { data } = await supabase
    .from('user_profiles').select('role').eq('id', req.userId).single();
  if (!data || data.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

router.use(requireAuth, requireAdmin);

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    let query = supabase.from('user_profiles').select('*', { count: 'exact' });
    if (search) query = query.or(`username.ilike.%${search}%`);
    query = query.order('username').range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;
    if (error) throw error;

    res.json({ users: (users || []).map(mapProfile), total: count || 0, page, limit });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}.` });
    }

    const { data: target, error: fetchError } = await supabase
      .from('user_profiles').select('*').eq('id', req.params.id).single();
    if (fetchError || !target) return res.status(404).json({ error: 'User not found.' });
    if (target.id === req.userId) return res.status(400).json({ error: 'You cannot change your own role.' });
    if (target.role === role) return res.status(400).json({ error: `User already has the role '${role}'.` });

    const previousRole = target.role;

    const { error: updateError } = await supabase
      .from('user_profiles').update({ role }).eq('id', req.params.id);
    if (updateError) throw updateError;

    // Log to audit table
    const { data: adminProfile } = await supabase
      .from('user_profiles').select('username').eq('id', req.userId).single();

    await supabase.from('role_audit_log').insert({
      admin_id: req.userId,
      admin_username: adminProfile?.username || req.userId,
      target_user_id: target.id,
      target_username: target.username || target.id,
      previous_role: previousRole,
      new_role: role,
    });

    res.json({
      user: { ...mapProfile(target), role },
      audit: { previousRole, newRole: role, changedBy: adminProfile?.username || req.userId },
    });
  } catch (error) {
    console.error('Admin role update error:', error);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ── GET /api/admin/audit-log ──────────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    let query = supabase.from('role_audit_log').select('*', { count: 'exact' });
    if (req.query.userId) query = query.eq('target_user_id', req.query.userId);
    if (req.query.adminId) query = query.eq('admin_id', req.query.adminId);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: entries, error, count } = await query;
    if (error) throw error;

    res.json({ entries: (entries || []).map(mapAuditEntry), total: count || 0, page, limit });
  } catch (error) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
});

function mapProfile(p) {
  return { id: p.id, username: p.username, role: p.role || 'user', createdAt: p.created_at };
}

function mapAuditEntry(e) {
  return {
    id: e.id,
    adminId: e.admin_id,
    adminUsername: e.admin_username,
    targetUserId: e.target_user_id,
    targetUsername: e.target_username,
    previousRole: e.previous_role,
    newRole: e.new_role,
    createdAt: e.created_at,
  };
}

module.exports = router;
