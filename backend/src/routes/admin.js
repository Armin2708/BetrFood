const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { authenticate, requireAdmin } = require('./auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Initialize audit log table
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS role_audit_log (
    id TEXT PRIMARY KEY,
    adminId TEXT NOT NULL,
    adminUsername TEXT NOT NULL,
    targetUserId TEXT NOT NULL,
    targetUsername TEXT NOT NULL,
    previousRole TEXT NOT NULL,
    newRole TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_adminId ON role_audit_log(adminId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_targetUserId ON role_audit_log(targetUserId)`);

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/users?search=xxx&page=1&limit=20
// Search users and return with their roles
// ---------------------------------------------------------------------------
router.get('/users', (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (Math.max(parseInt(req.query.page) || 1, 1) - 1) * limit;

    let users;
    let total;

    if (search) {
      const pattern = `%${search}%`;
      users = db.prepare(`
        SELECT id, email, username, role, createdAt
        FROM auth_users
        WHERE username LIKE ? OR email LIKE ?
        ORDER BY username ASC
        LIMIT ? OFFSET ?
      `).all(pattern, pattern, limit, offset);

      total = db.prepare(`
        SELECT COUNT(*) as cnt FROM auth_users
        WHERE username LIKE ? OR email LIKE ?
      `).get(pattern, pattern).cnt;
    } else {
      users = db.prepare(`
        SELECT id, email, username, role, createdAt
        FROM auth_users
        ORDER BY username ASC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      total = db.prepare(`SELECT COUNT(*) as cnt FROM auth_users`).get().cnt;
    }

    res.json({ users, total, page: Math.floor(offset / limit) + 1, limit });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/role
// Assign a new role to a user — logged to audit table
// Body: { role: 'user' | 'moderator' | 'admin' }
// ---------------------------------------------------------------------------
router.put('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'admin'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}.` });
    }

    const targetUser = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    if (targetUser.role === role) {
      return res.status(400).json({ error: `User already has the role '${role}'.` });
    }

    const previousRole = targetUser.role;

    // Update role
    db.prepare('UPDATE auth_users SET role = ? WHERE id = ?').run(role, req.params.id);

    // Write audit log entry
    db.prepare(`
      INSERT INTO role_audit_log (id, adminId, adminUsername, targetUserId, targetUsername, previousRole, newRole)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user.id,
      req.user.username,
      targetUser.id,
      targetUser.username,
      previousRole,
      role
    );

    res.json({
      user: { id: targetUser.id, email: targetUser.email, username: targetUser.username, role },
      audit: { previousRole, newRole: role, changedBy: req.user.username },
    });
  } catch (error) {
    console.error('Admin role update error:', error);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/audit-log?userId=xxx&adminId=xxx&page=1&limit=20
// Retrieve role change audit log with optional filters
// ---------------------------------------------------------------------------
router.get('/audit-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (Math.max(parseInt(req.query.page) || 1, 1) - 1) * limit;
    const { userId, adminId } = req.query;

    const conditions = [];
    const params = [];

    if (userId) { conditions.push('targetUserId = ?'); params.push(userId); }
    if (adminId) { conditions.push('adminId = ?'); params.push(adminId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const entries = db.prepare(`
      SELECT * FROM role_audit_log
      ${where}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM role_audit_log ${where}
    `).get(...params).cnt;

    res.json({ entries, total, page: Math.floor(offset / limit) + 1, limit });
  } catch (error) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
});

module.exports = router;
