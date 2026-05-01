const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// ── Quiet hours helper ────────────────────────────────────────────────────────

/**
 * Check whether the current moment falls within a user's quiet hours.
 * Times are stored as "HH:MM" strings in the user's local timezone.
 * Returns true if notifications should be suppressed right now.
 */
function isInQuietHours(quietHoursStart, quietHoursEnd, timezone) {
  try {
    // Get the current time in the user's timezone as "HH:MM"
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
    const nowMinutes = parseInt(hour) * 60 + parseInt(minute);

    const [startH, startM] = quietHoursStart.split(':').map(Number);
    const [endH, endM] = quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same-day window (e.g. 09:00 → 17:00)
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // Overnight window (e.g. 22:00 → 07:00)
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
  } catch {
    // If timezone is invalid, don't suppress
    return false;
  }
}

/**
 * Check user's quiet hours preferences and return whether notifications
 * should be suppressed for this user right now.
 */
async function shouldSuppressForUser(userId) {
  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data || !data.quiet_hours_enabled) return false;

    return isInQuietHours(
      data.quiet_hours_start || '22:00',
      data.quiet_hours_end || '07:00',
      data.quiet_hours_timezone || 'UTC'
    );
  } catch {
    return false;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/check-expiring-all
 * Cron endpoint (no auth) — checks expiring pantry items for all opted-in users.
 */
router.post('/check-expiring-all', async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('user_id, expiring_items_threshold, notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
      .eq('expiration_notifications_enabled', true);

    if (usersError) throw usersError;

    let totalChecked = 0;
    let totalCreated = 0;
    let totalSuppressed = 0;

    for (const user of users || []) {
      if (user.notifications_enabled === false) continue;

      // Skip if user is currently in quiet hours
      if (user.quiet_hours_enabled && isInQuietHours(
        user.quiet_hours_start || '22:00',
        user.quiet_hours_end || '07:00',
        user.quiet_hours_timezone || 'UTC'
      )) {
        totalSuppressed++;
        continue;
      }

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
      suppressed: totalSuppressed,
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
 */
router.post('/check-expiring', async (req, res) => {
  try {
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('expiring_items_threshold, expiration_notifications_enabled, notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
      .eq('user_id', req.userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;

    if (prefs?.notifications_enabled === false) return res.json({ checked: 0, created: 0, skipped: true });
    if (prefs?.expiration_notifications_enabled === false) return res.json({ checked: 0, created: 0, skipped: true });

    // Suppress during quiet hours
    if (prefs?.quiet_hours_enabled && isInQuietHours(
      prefs.quiet_hours_start || '22:00',
      prefs.quiet_hours_end || '07:00',
      prefs.quiet_hours_timezone || 'UTC'
    )) {
      return res.json({ checked: 0, created: 0, suppressed: true });
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

    res.json({
      notifications: (data || []).map(formatNotification),
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
 * DELETE /api/notifications
 */
router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.userId);

    if (error) throw error;

    res.json({ message: 'All notifications cleared.' });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Notification not found.' });
      throw error;
    }

    res.json(formatNotification(data));
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function checkExpiringItemsForUser(userId, thresholdDays) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + thresholdDays);

  const { data: items, error: itemsError } = await supabase
    .from('pantry_items')
    .select('id, name, expiration_date')
    .eq('user_id', userId)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', cutoff.toISOString());

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return { checked: 0, created: 0 };

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

  const newNotifications = [];
  for (const item of items) {
    if (alreadyNotified.has(item.id)) continue;

    const expDate = new Date(item.expiration_date);
    const diffMs = expDate.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 0;

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
module.exports.shouldSuppressForUser = shouldSuppressForUser;
module.exports.isInQuietHours = isInQuietHours;
