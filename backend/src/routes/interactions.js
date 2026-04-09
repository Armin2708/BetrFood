const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  recordPostImpression,
  recordNegativeFeedback,
  getNegativeFeedbackPostIds,
  removeNegativeFeedback,
} = require('../db/interactions');

const router = express.Router();

/**
 * POST /api/interactions/post-view
 * Record a user viewing a post
 *
 * Body: {
 *   postId: string (UUID),
 *   viewDurationSeconds: number (seconds user viewed the post)
 * }
 */
router.post('/post-view', requireAuth, async (req, res) => {
  try {
    const { postId, viewDurationSeconds } = req.body;

    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ error: 'postId is required and must be a string' });
    }

    if (typeof viewDurationSeconds !== 'number' || viewDurationSeconds < 0) {
      return res.status(400).json({ error: 'viewDurationSeconds must be a positive number' });
    }

    // Only record if viewed for at least 2 seconds
    if (viewDurationSeconds < 2) {
      return res.json({ recorded: false, reason: 'View duration too short' });
    }

    await recordPostImpression(req.userId, postId, viewDurationSeconds);

    res.json({
      recorded: true,
      postId,
      durationSeconds: viewDurationSeconds,
    });
  } catch (error) {
    console.error('Error recording post view:', error);
    res.status(500).json({ error: 'Failed to record post view' });
  }
});

/**
 * POST /api/interactions/not-interested
 * Mark a post as "not interested"
 *
 * Body: {
 *   postId: string (UUID)
 * }
 */
router.post('/not-interested', requireAuth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ error: 'postId is required and must be a string' });
    }

    await recordNegativeFeedback(req.userId, postId, 'not_interested');

    res.json({
      success: true,
      postId,
      feedback: 'not_interested',
      message: 'We will show you fewer posts like this',
    });
  } catch (error) {
    console.error('Error recording not interested feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * DELETE /api/interactions/not-interested/:postId
 * Undo "not interested" feedback on a post
 */
router.delete('/not-interested/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ error: 'postId is required and must be a string' });
    }

    await removeNegativeFeedback(req.userId, postId);

    res.json({
      success: true,
      postId,
      message: 'Feedback removed',
    });
  } catch (error) {
    console.error('Error removing not interested feedback:', error);
    res.status(500).json({ error: 'Failed to remove feedback' });
  }
});

/**
 * GET /api/interactions/not-interested
 * Get all posts the user marked as "not interested"
 */
router.get('/not-interested', requireAuth, async (req, res) => {
  try {
    const postIds = await getNegativeFeedbackPostIds(req.userId);

    res.json({
      notInterestedPostIds: postIds,
      count: postIds.length,
    });
  } catch (error) {
    console.error('Error fetching not interested posts:', error);
    res.status(500).json({ error: 'Failed to fetch feedback history' });
  }
});

module.exports = router;
