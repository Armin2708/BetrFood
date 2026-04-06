const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/users/blocked - List blocked users (auth required)
// NOTE: Must be defined BEFORE /:id/* routes to avoid "blocked" matching as :id
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
// NOTE: Must be defined BEFORE /:id/* routes to avoid "muted" matching as :id
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

// POST /api/users/:id/block - Block user (auth required)
router.post('/:id/block', requireAuth, async (req, res) => {
  console.log('\n========== [BLOCK] POST REQUEST ==========');
  console.log('[BLOCK] Request received - blocker:', req.userId, 'blocked:', req.params.id);
  console.log('[BLOCK] Headers:', JSON.stringify(req.headers, null, 2));
  try {
    const blockedId = req.params.id;

    if (req.userId === blockedId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    console.log('[BLOCK] Inserting into user_blocks:', { blocker_id: req.userId, blocked_id: blockedId });
    const { data, error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: req.userId, blocked_id: blockedId })
      .select();

    console.log('[BLOCK] Insert result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));

    if (error) {
      console.error('[BLOCK] DB error code:', error.code, 'message:', error.message, 'details:', error.details);
      if (error.code === '23505') {
        console.log('[BLOCK] Already blocked - returning 200');
        return res.json({ message: 'User already blocked.' });
      }
      throw error;
    }

    if (!data || data.length === 0) {
      console.error('[BLOCK] Insert returned no data and no error - possible RLS or silent failure');
      return res.status(500).json({ error: 'Block was not saved. Please try again.' });
    }

    console.log('[BLOCK] Saved successfully:', JSON.stringify(data));
    res.status(201).json({ message: 'User blocked successfully.' });
  } catch (error) {
    console.error('[BLOCK] Catch error:', error.message, error.stack);
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

// GET /api/users/:id/block-status - Check if current user has blocked a user (auth required)
router.get('/:id/block-status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocker_id', req.userId)
      .eq('blocked_id', req.params.id)
      .maybeSingle();

    if (error) throw error;

    res.json({ isBlocked: !!data });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({ error: 'Failed to check block status.' });
  }
});

// GET /api/users/:id/mute-status - Check if current user has muted a user (auth required)
router.get('/:id/mute-status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_mutes')
      .select('muter_id')
      .eq('muter_id', req.userId)
      .eq('muted_id', req.params.id)
      .maybeSingle();

    if (error) throw error;

    res.json({ isMuted: !!data });
  } catch (error) {
    console.error('Error checking mute status:', error);
    res.status(500).json({ error: 'Failed to check mute status.' });
  }
});

module.exports = router;
