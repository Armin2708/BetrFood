const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { postId, reason, description } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId is required.' });
    if (!reason) return res.status(400).json({ error: 'reason is required.' });

    const { data: post } = await supabase.from('posts').select('id').eq('id', postId).single();
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        post_id: postId,
        reporter_id: req.userId,
        reason,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(mapReport(report));
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ── GET /api/reports ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((reports || []).map(mapReport));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── PUT /api/reports/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewed', 'actioned', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}.` });
    }

    const { data: updated, error } = await supabase
      .from('reports')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: req.userId })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapReport(updated));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

function mapReport(r) {
  return {
    id: r.id,
    postId: r.post_id,
    reporterId: r.reporter_id,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  };
}

module.exports = router;
