const express = require("express");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// DELETE /api/users/me — permanently delete the current user's account and all data
router.delete("/me", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    // Cascade delete all user data in order (respect FK constraints)

    // 1. Get all post IDs for media cleanup
    const { data: posts } = await supabase
      .from("posts")
      .select("id, image_path")
      .eq("user_id", userId);

    const postIds = (posts || []).map(p => p.id);

    if (postIds.length > 0) {
      // Delete media from Supabase Storage
      const { data: postImages } = await supabase
        .from("post_images")
        .select("image_path")
        .in("post_id", postIds);

      const mediaPaths = new Set();
      (postImages || []).forEach(img => { if (img.image_path) mediaPaths.add(img.image_path); });
      (posts || []).forEach(p => { if (p.image_path) mediaPaths.add(p.image_path); });

      for (const mediaPath of mediaPaths) {
        if (typeof mediaPath === 'string' && mediaPath.includes('/post-media/')) {
          const filename = mediaPath.split('/post-media/').pop();
          await supabase.storage.from('post-media').remove([filename]).catch(() => {});
        }
      }

      // Delete post-related data
      await supabase.from("post_images").delete().in("post_id", postIds);
      await supabase.from("post_tags").delete().in("post_id", postIds);
      await supabase.from("likes").delete().in("post_id", postIds);
      await supabase.from("comments").delete().in("post_id", postIds);
      await supabase.from("saves").delete().in("post_id", postIds);
      await supabase.from("recipe_ingredients").delete().in("recipe_id",
        (await supabase.from("recipes").select("id").in("post_id", postIds)).data?.map(r => r.id) || []
      );
      await supabase.from("recipe_steps").delete().in("recipe_id",
        (await supabase.from("recipes").select("id").in("post_id", postIds)).data?.map(r => r.id) || []
      );
      await supabase.from("recipes").delete().in("post_id", postIds);
      await supabase.from("posts").delete().eq("user_id", userId);
    }

    // 2. Delete other user data
    await supabase.from("user_follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    await supabase.from("user_blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await supabase.from("user_mutes").delete().or(`muter_id.eq.${userId},muted_id.eq.${userId}`);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("pantry_items").delete().eq("user_id", userId);
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    await supabase.from("collection_posts").delete().in("collection_id",
      (await supabase.from("collections").select("id").eq("user_id", userId)).data?.map(c => c.id) || []
    );
    await supabase.from("collections").delete().eq("user_id", userId);
    await supabase.from("user_preferences").delete().eq("user_id", userId);
    await supabase.from("comments").delete().eq("user_id", userId);
    await supabase.from("likes").delete().eq("user_id", userId);

    // 3. Delete profile last
    await supabase.from("user_profiles").delete().eq("id", userId);

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

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

    // Create a notification for the followed user
    try {
      // Fetch follower's profile for the notification data
      const { data: followerProfile } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", followerId)
        .maybeSingle();

      await supabase.from("notifications").insert({
        user_id: followingId,
        type: "new_follower",
        data: {
          followerId,
          followerUsername: followerProfile?.username || null,
        },
      });
    } catch (notifError) {
      // Log but don't fail the follow action if notification fails
      console.error("Error creating follow notification:", notifError);
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

// GET /api/users/:id/follow-status (auth required)
router.get("/:id/follow-status", requireAuth, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.userId;

  try {
    const { data, error } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      isFollowing: !!data,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ error: "Failed to check follow status." });
  }
});

// GET /api/users/:id/followers (auth required) - list of users who follow the target user
router.get("/:id/followers", requireAuth, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.userId;

  try {
    // Get all follower IDs for the target user
    const { data: followRelations, error: followError } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", targetUserId);

    if (followError) throw followError;

    const followerIds = (followRelations || []).map(f => f.follower_id);

    if (followerIds.length === 0) {
      return res.json([]);
    }

    // Get user profiles for all followers
    const { data: followerProfiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followerIds);

    if (profileError) throw profileError;

    // Get the list of users that the current user is following to determine isFollowingBack
    const { data: currentUserFollowing, error: followingError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    if (followingError) throw followingError;

    const followingIds = new Set((currentUserFollowing || []).map(f => f.following_id));

    // Format the response
    const formattedFollowers = (followerProfiles || []).map(profile => ({
      id: profile.id,
      username: profile.username || '',
      name: profile.display_name || '',
      avatar: profile.avatar_url || '',
      isFollowingBack: followingIds.has(profile.id),
    }));

    res.json(formattedFollowers);
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Failed to fetch followers." });
  }
});

// GET /api/users/:id/following (auth required) - list of users that the target user follows
router.get("/:id/following", requireAuth, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.userId;

  try {
    // Get all following IDs for the target user
    const { data: followRelations, error: followError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", targetUserId);

    if (followError) throw followError;

    const followingUserIds = (followRelations || []).map(f => f.following_id);

    if (followingUserIds.length === 0) {
      return res.json([]);
    }

    // Get user profiles for all users being followed
    const { data: followingProfiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followingUserIds);

    if (profileError) throw profileError;

    // Get the list of users that the current user is following to determine isFollowing
    const { data: currentUserFollowing, error: followingError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    if (followingError) throw followingError;

    const currentUserFollowingIds = new Set((currentUserFollowing || []).map(f => f.following_id));

    // Format the response
    const formattedFollowing = (followingProfiles || []).map(profile => ({
      id: profile.id,
      username: profile.username || '',
      name: profile.display_name || '',
      avatar: profile.avatar_url || '',
      isFollowing: currentUserFollowingIds.has(profile.id),
    }));

    res.json(formattedFollowing);
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Failed to fetch following." });
  }
});

module.exports = router;
