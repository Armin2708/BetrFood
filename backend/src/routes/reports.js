const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/reports - Create a report (auth required)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required.' });
    }

    const validTypes = ['post', 'comment', 'user'];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json({ error: 'targetType must be one of: post, comment, user.' });
    }

    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'reason must be a non-empty string.' });
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: req.userId,
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      reporterId: data.reporter_id,
      targetType: data.target_type,
      targetId: data.target_id,
      reason: data.reason,
      status: data.status,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

module.exports = router;
