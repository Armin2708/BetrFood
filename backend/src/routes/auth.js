const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

router.use(authLimiter);

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

// Export clerkApi for use by other routes (e.g. account deletion)
router.clerkApi = clerkApi;

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
