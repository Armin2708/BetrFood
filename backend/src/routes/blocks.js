const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/users/:id/block - Block user (auth required)
router.post('/:id/block', requireAuth, async (req, res) => {
  try {
    const blockedId = req.params.id;

    if (req.userId === blockedId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: req.userId, blocked_id: blockedId });

    if (error) {
      if (error.code === '23505') {
        return res.json({ message: 'User already blocked.' });
      }
      throw error;
    }

    res.status(201).json({ message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user.' });
  }
});

// DELETE /api/users/:id/block - Unblock user (auth required)
router.delete('/:id/block', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', req.userId)
      .eq('blocked_id', req.params.id);

    if (error) throw error;

    res.json({ message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user.' });
  }
});

// POST /api/users/:id/mute - Mute user (auth required)
router.post('/:id/mute', requireAuth, async (req, res) => {
  try {
    const mutedId = req.params.id;

    if (req.userId === mutedId) {
      return res.status(400).json({ error: 'You cannot mute yourself.' });
    }

    const { error } = await supabase
      .from('user_mutes')
      .insert({ muter_id: req.userId, muted_id: mutedId });

    if (error) {
      if (error.code === '23505') {
        return res.json({ message: 'User already muted.' });
      }
      throw error;
    }

    res.status(201).json({ message: 'User muted successfully.' });
  } catch (error) {
    console.error('Error muting user:', error);
    res.status(500).json({ error: 'Failed to mute user.' });
  }
});

// DELETE /api/users/:id/mute - Unmute user (auth required)
router.delete('/:id/mute', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_mutes')
      .delete()
      .eq('muter_id', req.userId)
      .eq('muted_id', req.params.id);

    if (error) throw error;

    res.json({ message: 'User unmuted successfully.' });
  } catch (error) {
    console.error('Error unmuting user:', error);
    res.status(500).json({ error: 'Failed to unmute user.' });
  }
});

// GET /api/users/blocked - List blocked users (auth required)
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Enrich with profile data
    const userIds = data.map(b => b.blocked_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);

    const profileMap = {};
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p;
      }
    }

    res.json(
      data.map(b => {
        const profile = profileMap[b.blocked_id] || {};
        return {
          userId: b.blocked_id,
          displayName: profile.display_name || null,
          username: profile.username || null,
          avatarUrl: profile.avatar_url || null,
          blockedAt: b.created_at,
        };
      })
    );
  } catch (error) {
    console.error('Error listing blocked users:', error);
    res.status(500).json({ error: 'Failed to list blocked users.' });
  }
});

// GET /api/users/muted - List muted users (auth required)
router.get('/muted', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_mutes')
      .select('muted_id, created_at')
      .eq('muter_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Enrich with profile data
    const userIds = data.map(m => m.muted_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);

    const profileMap = {};
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p;
      }
    }

    res.json(
      data.map(m => {
        const profile = profileMap[m.muted_id] || {};
        return {
          userId: m.muted_id,
          displayName: profile.display_name || null,
          username: profile.username || null,
          avatarUrl: profile.avatar_url || null,
          mutedAt: m.created_at,
        };
      })
    );
  } catch (error) {
    console.error('Error listing muted users:', error);
    res.status(500).json({ error: 'Failed to list muted users.' });
  }
});

module.exports = router;
