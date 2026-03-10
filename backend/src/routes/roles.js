const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getUserRole } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/roles/me
 * Returns the current user's role. Lightweight endpoint for frontend role checks.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const role = await getUserRole(req.userId);
    res.json({ role });
  } catch (err) {
    console.error('Error fetching user role:', err);
    res.status(500).json({ error: 'Failed to fetch role.' });
  }
});

module.exports = router;
