const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// All notification routes require authentication
router.use(requireAuth);

/**
 * GET /api/notifications
 * List the authenticated user's notifications with pagination.
 * Query params: limit (default 20), offset (default 0)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const notifications = (data || []).map(formatNotification);

    res.json({
      notifications,
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications for the authenticated user.
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('read', false);

    if (error) throw error;

    res.json({ unreadCount: count || 0 });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread notification count.' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
router.put('/read-all', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.userId)
      .eq('read', false);

    if (error) throw error;

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Notification not found.' });
      }
      throw error;
    }

    res.json(formatNotification(data));
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

/**
 * Helper: convert DB row to API response (camelCase mapping).
 */
function formatNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    data: row.data,
    read: row.read,
    createdAt: row.created_at,
  };
}

module.exports = router;
