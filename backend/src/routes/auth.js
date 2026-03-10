const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const jsonDb = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Initialize tables
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

try {
  db.exec(`ALTER TABLE auth_users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin'))`);
} catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES auth_users(id) ON DELETE CASCADE
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'betrfood_salt').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

function tokenExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function getUserFromToken(token) {
  const session = db.prepare(`
    SELECT s.*, u.id as userId, u.email, u.username, u.role
    FROM sessions s
    JOIN auth_users u ON u.id = s.userId
    WHERE s.token = ? AND s.expiresAt > datetime('now')
  `).get(token);
  return session || null;
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const session = getUserFromToken(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session.' });
  req.user = { id: session.userId, email: session.email, username: session.username, role: session.role };
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

module.exports.authenticate = authenticate;
module.exports.requireAdmin = requireAdmin;

// ---------------------------------------------------------------------------
// Helper — delete a file from disk safely
// ---------------------------------------------------------------------------
function deleteFile(filePath) {
  try {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    const filename = path.basename(filePath);
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.error('Failed to delete file:', filePath, e.message);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
router.post('/signup', (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });
    if (!username) return res.status(400).json({ error: 'Username is required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existingEmail = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(email);
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists.' });

    const existingUsername = db.prepare('SELECT id FROM auth_users WHERE username = ?').get(username);
    if (existingUsername) return res.status(409).json({ error: 'Username is already taken.' });

    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    db.prepare(`INSERT INTO auth_users (id, email, username, passwordHash, role) VALUES (?, ?, ?, ?, 'user')`)
      .run(id, email.toLowerCase().trim(), username.trim(), passwordHash);

    try {
      db.prepare(`INSERT OR IGNORE INTO users (id, username, displayName, bio, avatarUrl, isPrivate) VALUES (?, ?, ?, '', '', 0)`)
        .run(id, username.trim(), username.trim());
    } catch (_) {}

    const token = generateToken();
    const expiresAt = tokenExpiresAt();
    db.prepare(`INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)`).run(token, id, expiresAt);

    res.status(201).json({
      token,
      user: { id, email: email.toLowerCase().trim(), username: username.trim(), role: 'user' },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const user = db.prepare('SELECT * FROM auth_users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    db.prepare('DELETE FROM sessions WHERE userId = ?').run(user.id);

    const token = generateToken();
    const expiresAt = tokenExpiresAt();
    db.prepare(`INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)`).run(token, user.id, expiresAt);

    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'No token provided.' });
    const session = getUserFromToken(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired session.' });
    res.json({ id: session.userId, email: session.email, username: session.username, role: session.role });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to validate session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  try {
    const token = extractToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.json({ message: 'Logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/account — permanently delete account and all user data
// Requires: Authorization: Bearer <token> + body: { password }
// Re-authenticates before proceeding. Cascade-deletes everything.
// ---------------------------------------------------------------------------
router.delete('/account', (req, res) => {
  try {
    // ── Step 1: Validate session token ──────────────────────────────────────
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const session = getUserFromToken(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired session.' });

    const userId = session.userId;

    // ── Step 2: Re-authenticate with password ────────────────────────────────
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required to delete your account.' });

    const authUser = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(userId);
    if (!authUser) return res.status(404).json({ error: 'Account not found.' });

    if (authUser.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // ── Step 3: Cascade delete everything in a single transaction ────────────
    const deleteAll = db.transaction(() => {

      // 3a. Delete all posts and their media from disk
      const userPosts = jsonDb.getAllPosts().filter(p => p.userId === userId);
      for (const post of userPosts) {
        // Delete image files
        if (post.imagePaths && post.imagePaths.length > 0) {
          post.imagePaths.forEach(deleteFile);
        } else if (post.imagePath) {
          deleteFile(post.imagePath);
        }
        // Delete video file
        if (post.videoPath) deleteFile(post.videoPath);

        // Delete post_tags, recipe_ingredients, recipe_steps, recipes from SQLite
        try {
          db.prepare('DELETE FROM post_tags WHERE postId = ?').run(post.id);
          const recipe = db.prepare('SELECT id FROM recipes WHERE postId = ?').get(post.id);
          if (recipe) {
            db.prepare('DELETE FROM recipe_ingredients WHERE recipeId = ?').run(recipe.id);
            db.prepare('DELETE FROM recipe_steps WHERE recipeId = ?').run(recipe.id);
            db.prepare('DELETE FROM recipes WHERE id = ?').run(recipe.id);
          }
        } catch (_) {}

        // Delete from JSON store
        jsonDb.deletePost(post.id);
      }

      // 3b. Delete follows (both directions)
      db.prepare('DELETE FROM follows WHERE followerId = ? OR followingId = ?').run(userId, userId);

      // 3c. Delete reports filed by or against this user's posts
      try {
        db.prepare('DELETE FROM reports WHERE reporterId = ?').run(userId);
      } catch (_) {}

      // 3d. Delete role audit log entries involving this user
      try {
        db.prepare('DELETE FROM role_audit_log WHERE adminId = ? OR targetUserId = ?').run(userId, userId);
      } catch (_) {}

      // 3e. Delete user profile
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      // 3f. Delete all sessions (invalidates all devices)
      db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);

      // 3g. Delete auth record — this is the point of no return
      db.prepare('DELETE FROM auth_users WHERE id = ?').run(userId);
    });

    deleteAll();

    res.json({ message: 'Account permanently deleted.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
});

module.exports.router = router;
