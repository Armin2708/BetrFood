const { verifyToken } = require('@clerk/express');

/**
 * Middleware that verifies the Clerk JWT from the Authorization header.
 * Sets req.userId (Clerk user ID) on success.
 */
async function requireAuth(req, res, next) {
  console.log(`[AUTH] ${req.method} ${req.originalUrl}`);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] ✗ No Bearer token found in headers');
    console.log('[AUTH]   Headers received:', Object.keys(req.headers).join(', '));
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  console.log('[AUTH] Token present, length:', token.length, '| starts with:', token.substring(0, 20) + '...');

  try {
    const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
    console.log('[AUTH] CLERK_SECRET_KEY present:', hasSecretKey);
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.userId = payload.sub;
    console.log('[AUTH] ✓ Verified user:', req.userId);
    next();
  } catch (error) {
    console.error('[AUTH] ✗ Token verification failed:', error.message);
    console.error('[AUTH]   Full error:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional auth — sets req.userId if token is present, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.userId = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.userId = payload.sub;
  } catch {
    req.userId = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
