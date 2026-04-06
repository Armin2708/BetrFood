const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/notifications/check-expiring-all
 * Cron endpoint (no auth) — checks expiring pantry items for all opted-in users
 * and creates notification records.
 */
router.post('/check-expiring-all', async (req, res) => {
  try {
    // Get all users who have expiration notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('user_id, expiring_items_threshold')
      .eq('expiration_notifications_enabled', true);

    if (usersError) throw usersError;

    let totalChecked = 0;
    let totalCreated = 0;

    for (const user of users || []) {
      const { checked, created } = await checkExpiringItemsForUser(
        user.user_id,
        user.expiring_items_threshold || 7
      );
      totalChecked += checked;
      totalCreated += created;
    }

    res.json({
      usersProcessed: (users || []).length,
      checked: totalChecked,
      created: totalCreated,
    });
  } catch (err) {
    console.error('Error checking expiring items for all users:', err);
    res.status(500).json({ error: 'Failed to check expiring items.' });
  }
});

// All remaining notification routes require authentication
router.use(requireAuth);

/**
 * POST /api/notifications/check-expiring
 * Check the authenticated user's pantry for expiring items and create notifications.
 */
router.post('/check-expiring', async (req, res) => {
  try {
    // Fetch user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('expiring_items_threshold, expiration_notifications_enabled')
      .eq('user_id', req.userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;

    const enabled = prefs?.expiration_notifications_enabled ?? false;
    if (!enabled) {
      return res.json({ checked: 0, created: 0 });
    }

    const threshold = prefs?.expiring_items_threshold || 7;
    const { checked, created } = await checkExpiringItemsForUser(req.userId, threshold);

    res.json({ checked, created });
  } catch (err) {
    console.error('Error checking expiring items:', err);
    res.status(500).json({ error: 'Failed to check expiring items.' });
  }
});

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

/**
 * Helper: check expiring pantry items for a single user and create notifications.
 * Returns { checked, created } counts.
 */
async function checkExpiringItemsForUser(userId, thresholdDays) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + thresholdDays);

  // Get pantry items expiring within the threshold window
  const { data: items, error: itemsError } = await supabase
    .from('pantry_items')
    .select('id, name, expiration_date')
    .eq('user_id', userId)
    .gte('expiration_date', now.toISOString())
    .lte('expiration_date', cutoff.toISOString());

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return { checked: 0, created: 0 };

  // Check which items already have a recent notification (last 24 hours)
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: existing, error: existingError } = await supabase
    .from('notifications')
    .select('data')
    .eq('user_id', userId)
    .eq('type', 'expiring_item')
    .gte('created_at', oneDayAgo.toISOString());

  if (existingError) throw existingError;

  const alreadyNotified = new Set(
    (existing || []).map((n) => n.data?.itemId).filter(Boolean)
  );

  // Build notification rows for items not yet notified
  const newNotifications = [];
  for (const item of items) {
    if (alreadyNotified.has(item.id)) continue;

    const expDate = new Date(item.expiration_date);
    const diffMs = expDate.getTime() - now.getTime();
    const daysUntilExpiry = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    newNotifications.push({
      user_id: userId,
      actor_id: userId,
      type: 'expiring_item',
      data: {
        itemId: item.id,
        itemName: item.name,
        expirationDate: item.expiration_date,
        daysUntilExpiry,
      },
      read: false,
    });
  }

  if (newNotifications.length > 0) {
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(newNotifications);

    if (insertError) throw insertError;
  }

  return { checked: items.length, created: newNotifications.length };
}

module.exports = router;
