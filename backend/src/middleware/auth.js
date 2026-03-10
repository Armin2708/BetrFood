const { verifyToken } = require('@clerk/express');

/**
 * Middleware that verifies the Clerk JWT from the Authorization header.
 * Sets req.userId (Clerk user ID) on success.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Clerk token verification failed:', error.message);
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
