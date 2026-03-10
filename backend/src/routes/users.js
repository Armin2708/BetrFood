const express = require("express");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/users/:id/follow (auth required)
router.post("/:id/follow", requireAuth, async (req, res) => {
  const followingId = req.params.id;
  const followerId = req.userId;

  if (followerId === followingId) {
    return res.status(400).json({ error: "Users cannot follow themselves." });
  }

  try {
    const { data, error } = await supabase
      .from("user_follows")
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: "Already following this user." });
      }
      throw error;
    }

    res.json({
      message: "User followed successfully.",
      followerId,
      followingId,
    });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Failed to follow user." });
  }
});

// DELETE /api/users/:id/follow (auth required)
router.delete("/:id/follow", requireAuth, async (req, res) => {
  const followingId = req.params.id;
  const followerId = req.userId;

  try {
    const { data, error, count } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;

    res.json({
      message: "User unfollowed successfully.",
      followerId,
      followingId,
    });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Failed to unfollow user." });
  }
});

// GET /api/users/:id/follow-stats
router.get("/:id/follow-stats", async (req, res) => {
  const userId = req.params.id;

  try {
    const { count: followerCount, error: e1 } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount, error: e2 } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    if (e1) throw e1;
    if (e2) throw e2;

    res.json({
      userId,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error) {
    console.error("Error fetching follow stats:", error);
    res.status(500).json({ error: "Failed to fetch follow stats." });
  }
});

module.exports = router;
