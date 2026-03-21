const supabase = require('../db/supabase');
const { verifyToken } = require('@clerk/express');

const DEV_BYPASS_AUTH = process.env.DEV_BYPASS_AUTH === 'true';
const DEV_BYPASS_USER_ID = process.env.DEV_BYPASS_USER_ID || 'dev-user-local';
const DEV_BYPASS_ROLE = process.env.DEV_BYPASS_ROLE || 'user';
const DEV_BYPASS_EMAIL = process.env.DEV_BYPASS_EMAIL || 'dev@betrfood.local';
const DEV_BYPASS_DISPLAY_NAME = process.env.DEV_BYPASS_DISPLAY_NAME || 'Dev User';
const DEV_BYPASS_USERNAME = process.env.DEV_BYPASS_USERNAME || 'devuser';

async function applyDevBypass(req) {
  if (!DEV_BYPASS_AUTH) return false;

  const headerUserId = req.headers['x-dev-bypass-user-id'];
  const headerRole = req.headers['x-dev-bypass-role'];
  const userId = typeof headerUserId === 'string' && headerUserId ? headerUserId : DEV_BYPASS_USER_ID;
  const role = typeof headerRole === 'string' && headerRole ? headerRole : DEV_BYPASS_ROLE;

  req.userId = userId;
  req.userRole = role;

  await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      display_name: DEV_BYPASS_DISPLAY_NAME,
      username: DEV_BYPASS_USERNAME,
      role,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  req.devBypassEmail = DEV_BYPASS_EMAIL;
  return true;
}

/**
 * Middleware that verifies the Clerk JWT from the Authorization header.
 * Sets req.userId (Clerk user ID) on success.
 */
async function requireAuth(req, res, next) {
  if (await applyDevBypass(req)) {
    return next();
  }

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
    console.error('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional auth — sets req.userId if token is present, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  if (await applyDevBypass(req)) {
    return next();
  }

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
