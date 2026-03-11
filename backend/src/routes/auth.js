const express = require('express');
const https = require('https');
const { verifyToken } = require('@clerk/express');

const router = express.Router();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Make a request to the Clerk Backend API.
 */
function clerkApi(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.clerk.com',
      path: '/v1' + path,
      method,
      headers: {
        'Authorization': 'Bearer ' + CLERK_SECRET_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
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
    if (data) req.write(data);
    req.end();
  });
}

/**
 * POST /api/auth/signup
 * Body: { email, password, firstName?, lastName? }
 * Creates a Clerk user via Backend API (bypasses CAPTCHA), creates a session, returns JWT.
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Create user via Clerk Backend API
    const createResult = await clerkApi('POST', '/users', {
      email_address: [email],
      password,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      username: username || undefined,
    });

    if (createResult.status !== 200) {
      const msg =
        createResult.data?.errors?.[0]?.long_message ||
        createResult.data?.errors?.[0]?.message ||
        'Signup failed';
      return res.status(createResult.status === 422 ? 422 : 400).json({ error: msg });
    }

    const userId = createResult.data.id;

    // Create a session for the new user
    const sessionResult = await clerkApi('POST', '/sessions', { user_id: userId });
    if (sessionResult.status !== 200) {
      return res.status(500).json({ error: 'Account created but failed to create session.' });
    }

    // Get a JWT token for the session
    const tokenResult = await clerkApi('POST', `/sessions/${sessionResult.data.id}/tokens`);
    if (!tokenResult.data?.jwt) {
      return res.status(500).json({ error: 'Account created but failed to get token.' });
    }

    res.status(201).json({
      token: tokenResult.data.jwt,
      sessionId: sessionResult.data.id,
      user: {
        id: userId,
        email,
        firstName: createResult.data.first_name || null,
        lastName: createResult.data.last_name || null,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Verifies credentials via Clerk Backend API, returns JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Verify the password using Clerk's verify_password endpoint
    // First, find the user by email
    const usersResult = await clerkApi('GET', `/users?email_address=${encodeURIComponent(email)}`);

    if (usersResult.status !== 200 || !usersResult.data?.length) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = usersResult.data[0];

    // Verify password
    const verifyResult = await clerkApi('POST', `/users/${user.id}/verify_password`, { password });

    if (verifyResult.status !== 200 || !verifyResult.data?.verified) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create a session
    const sessionResult = await clerkApi('POST', '/sessions', { user_id: user.id });
    if (sessionResult.status !== 200) {
      return res.status(500).json({ error: 'Login verified but failed to create session.' });
    }

    // Get JWT
    const tokenResult = await clerkApi('POST', `/sessions/${sessionResult.data.id}/tokens`);
    if (!tokenResult.data?.jwt) {
      return res.status(500).json({ error: 'Login verified but failed to get token.' });
    }

    res.json({
      token: tokenResult.data.jwt,
      sessionId: sessionResult.data.id,
      user: {
        id: user.id,
        email: user.email_addresses?.[0]?.email_address || email,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * POST /api/auth/refresh
 * Body: { sessionId }
 * Gets a fresh JWT for an existing session (tokens expire in ~60s).
 */
router.post('/refresh', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const tokenResult = await clerkApi('POST', `/sessions/${sessionId}/tokens`);

    if (tokenResult.status !== 200 || !tokenResult.data?.jwt) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    res.json({ token: tokenResult.data.jwt });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
});

/**
 * POST /api/auth/logout
 * Body: { sessionId }
 * Revokes the session.
 */
router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await clerkApi('POST', `/sessions/${sessionId}/revoke`);
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out.' });
  }
});

module.exports = router;
