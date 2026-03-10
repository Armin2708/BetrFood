const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');

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
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

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
  // Sessions last 30 days
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function getUserFromToken(token) {
  const session = db.prepare(`
    SELECT s.*, u.id as userId, u.email, u.username
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

    db.prepare(`
      INSERT INTO auth_users (id, email, username, passwordHash)
      VALUES (?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), username.trim(), passwordHash);

    // Also ensure a users profile row exists
    try {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, username, displayName, bio, avatarUrl, isPrivate)
        VALUES (?, ?, ?, '', '', 0)
      `).run(id, username.trim(), username.trim());
    } catch (_) {}

    const token = generateToken();
    const expiresAt = tokenExpiresAt();
    db.prepare(`INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)`)
      .run(token, id, expiresAt);

    res.status(201).json({
      token,
      user: { id, email: email.toLowerCase().trim(), username: username.trim() },
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

    const passwordHash = hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Invalidate old sessions for this user (one active session at a time)
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(user.id);

    const token = generateToken();
    const expiresAt = tokenExpiresAt();
    db.prepare(`INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)`)
      .run(token, user.id, expiresAt);

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — validate token and return current user
// ---------------------------------------------------------------------------
router.get('/me', (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    const session = getUserFromToken(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired session.' });

    res.json({ id: session.userId, email: session.email, username: session.username });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to validate session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — invalidate token
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ message: 'Logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

module.exports = router;
