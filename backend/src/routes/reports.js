const express = require('express');
const db = require('../db/database');

const router = express.Router();

// ---------------------------------------------------------------------------
// Initialize reports table
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    reporterId TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    reviewedAt TEXT,
    reviewedBy TEXT,
    UNIQUE(postId, reporterId)
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_postId ON reports(postId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);

const VALID_REASONS = ['spam', 'harassment', 'hate_speech', 'misinformation', 'violence', 'nudity', 'other'];

// ---------------------------------------------------------------------------
// POST /api/reports — submit a report
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { postId, reporterId, reason, description } = req.body;

    if (!postId) return res.status(400).json({ error: 'postId is required.' });
    if (!reporterId) return res.status(400).json({ error: 'reporterId is required.' });
    if (!reason) return res.status(400).json({ error: 'reason is required.' });
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` });
    }

    const { randomUUID } = require('crypto');
    const id = randomUUID();

    try {
      db.prepare(`
        INSERT INTO reports (id, postId, reporterId, reason, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, postId, reporterId, reason, description || null);
    } catch (e) {
      // UNIQUE constraint: user already reported this post
      if (e.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'You have already reported this post.' });
      }
      throw e;
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    res.status(201).json(report);
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports — list reports (moderation use; filter by status)
// Query params: status, postId
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { status, postId } = req.query;

    let query = 'SELECT * FROM reports WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (postId) {
      query += ' AND postId = ?';
      params.push(postId);
    }

    query += ' ORDER BY createdAt DESC';

    const reports = db.prepare(query).all(...params);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/reports/:id — update report status (moderation action)
// Body: { status, reviewedBy }
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { status, reviewedBy } = req.body;
    const validStatuses = ['pending', 'reviewed', 'actioned', 'dismissed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = db.prepare(`
      UPDATE reports
      SET status = ?, reviewedAt = datetime('now'), reviewedBy = ?
      WHERE id = ?
    `).run(status, reviewedBy || null, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Report not found.' });

    res.json(db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id));
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

module.exports = router;
