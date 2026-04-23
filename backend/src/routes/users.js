const express = require("express");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/users/me/reset-recommendations — clear recommendation-signal data for the current user
// Deletes: post_impressions, post_negative_feedback, and user_preference_vectors rows for this user.
// After reset the For You feed falls back to non-personalized content (cold-start path in
// getUserPreferenceVector rebuilds a neutral vector on next fetch).
router.post("/me/reset-recommendations", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { count: impressionsCount, error: impErr } = await supabase
      .from("post_impressions")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (impErr) throw impErr;

    const { count: negativeCount, error: negErr } = await supabase
      .from("post_negative_feedback")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (negErr) throw negErr;

    const { count: vectorCount, error: vecErr } = await supabase
      .from("user_preference_vectors")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (vecErr) throw vecErr;

    res.json({
      message: "Recommendations reset.",
      deleted: {
        impressions: impressionsCount || 0,
        negativeFeedback: negativeCount || 0,
        preferenceVector: vectorCount || 0,
      },
    });
  } catch (error) {
    console.error("Error resetting recommendations:", error);
    res.status(500).json({ error: "Failed to reset recommendations." });
  }
});

// GET /api/users/me/export — synchronous personal data export (JSON attachment).
// Aggregates every user-owned table and returns a single JSON file. Media is referenced
// by existing Supabase Storage URL (image_path / avatar_url); raw bytes are NOT embedded.
//
// NOTE: synchronous, in-memory aggregation. Suitable for users with bounded data volume
// (roughly <5k total rows across all tables). For users at scale this should be moved to
// a background job with email delivery — tracked in the follow-up issue.
router.get("/me/export", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const [
      userProfileRes,
      userPreferencesRes,
      userPreferenceVectorRes,
      postsRes,
      commentsRes,
      likesRes,
      savesRes,
      pantryItemsRes,
      collectionsRes,
      notificationsRes,
      followersRes,
      followingRes,
      followRequestsSentRes,
      followRequestsReceivedRes,
      blocksRes,
      mutesRes,
      postImpressionsRes,
      postNegativeFeedbackRes,
      chatConversationsRes,
      chatMessagesRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_preference_vectors").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("likes").select("*").eq("user_id", userId),
      supabase.from("saves").select("*").eq("user_id", userId),
      supabase.from("pantry_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("collections").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_follows").select("*").eq("following_id", userId),
      supabase.from("user_follows").select("*").eq("follower_id", userId),
      supabase.from("follow_requests").select("*").eq("requester_id", userId),
      supabase.from("follow_requests").select("*").eq("requested_user_id", userId),
      supabase.from("user_blocks").select("*").eq("blocker_id", userId),
      supabase.from("user_mutes").select("*").eq("muter_id", userId),
      supabase.from("post_impressions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("post_negative_feedback").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("chat_conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("reports").select("*").eq("reporter_id", userId).order("created_at", { ascending: false }),
    ]);

    const results = {
      user_profile: userProfileRes,
      user_preferences: userPreferencesRes,
      user_preference_vector: userPreferenceVectorRes,
      posts: postsRes,
      comments: commentsRes,
      likes: likesRes,
      saves: savesRes,
      pantry_items: pantryItemsRes,
      collections: collectionsRes,
      notifications: notificationsRes,
      followers: followersRes,
      following: followingRes,
      follow_requests_sent: followRequestsSentRes,
      follow_requests_received: followRequestsReceivedRes,
      blocks: blocksRes,
      mutes: mutesRes,
      post_impressions: postImpressionsRes,
      post_negative_feedback: postNegativeFeedbackRes,
      chat_conversations: chatConversationsRes,
      chat_messages: chatMessagesRes,
      reports: reportsRes,
    };

    for (const [key, r] of Object.entries(results)) {
      if (r && r.error) {
        throw new Error(`Failed to fetch ${key}: ${r.error.message}`);
      }
    }

    const postIds = (postsRes.data || []).map(p => p.id);
    const collectionIds = (collectionsRes.data || []).map(c => c.id);

    // Nested children (only for rows owned by the user) fetched in parallel
    const [
      postImagesRes,
      postTagsRes,
      recipesRes,
      collectionPostsRes,
    ] = await Promise.all([
      postIds.length
        ? supabase.from("post_images").select("*").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length
        ? supabase.from("post_tags").select("*").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length
        ? supabase.from("recipes").select("*").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      collectionIds.length
        ? supabase.from("collection_posts").select("*").in("collection_id", collectionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const [key, r] of Object.entries({ postImagesRes, postTagsRes, recipesRes, collectionPostsRes })) {
      if (r && r.error) {
        throw new Error(`Failed to fetch ${key}: ${r.error.message}`);
      }
    }

    const recipeIds = (recipesRes.data || []).map(r => r.id);
    const [recipeIngredientsRes, recipeStepsRes] = await Promise.all([
      recipeIds.length
        ? supabase.from("recipe_ingredients").select("*").in("recipe_id", recipeIds)
        : Promise.resolve({ data: [], error: null }),
      recipeIds.length
        ? supabase.from("recipe_steps").select("*").in("recipe_id", recipeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (recipeIngredientsRes.error) throw new Error(`Failed to fetch recipe_ingredients: ${recipeIngredientsRes.error.message}`);
    if (recipeStepsRes.error) throw new Error(`Failed to fetch recipe_steps: ${recipeStepsRes.error.message}`);

    const exportedAt = new Date().toISOString();
    const payload = {
      export_metadata: {
        user_id: userId,
        exported_at: exportedAt,
        schema_version: 1,
        note: "Media files are referenced by Supabase Storage URL (see user_profile.avatar_url, posts[].image_path, post_images[].image_path). Raw bytes are not included.",
      },
      user_profile: userProfileRes.data || null,
      user_preferences: userPreferencesRes.data || null,
      user_preference_vector: userPreferenceVectorRes.data || null,
      posts: postsRes.data || [],
      post_images: postImagesRes.data || [],
      post_tags: postTagsRes.data || [],
      recipes: recipesRes.data || [],
      recipe_ingredients: recipeIngredientsRes.data || [],
      recipe_steps: recipeStepsRes.data || [],
      comments: commentsRes.data || [],
      likes: likesRes.data || [],
      saves: savesRes.data || [],
      pantry_items: pantryItemsRes.data || [],
      collections: collectionsRes.data || [],
      collection_posts: collectionPostsRes.data || [],
      notifications: notificationsRes.data || [],
      followers: followersRes.data || [],
      following: followingRes.data || [],
      follow_requests_sent: followRequestsSentRes.data || [],
      follow_requests_received: followRequestsReceivedRes.data || [],
      blocks: blocksRes.data || [],
      mutes: mutesRes.data || [],
      post_impressions: postImpressionsRes.data || [],
      post_negative_feedback: postNegativeFeedbackRes.data || [],
      chat_conversations: chatConversationsRes.data || [],
      chat_messages: chatMessagesRes.data || [],
      reports: reportsRes.data || [],
    };

    const datePart = exportedAt.slice(0, 10);
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `betrfood-export-${safeUserId}-${datePart}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("Error exporting user data:", error);
    res.status(500).json({ error: "Failed to export user data." });
  }
});

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
    await supabase.from("follow_requests").delete().or(`requester_id.eq.${userId},requested_user_id.eq.${userId}`);
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

// === Follow Requests endpoints (must be before /:id routes) ===

// GET /api/users/follow-requests/pending — list incoming pending follow requests
router.get("/follow-requests/pending", requireAuth, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from("follow_requests")
      .select("requester_id, status, created_at, updated_at")
      .eq("requested_user_id", req.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enrich with requester profile data
    const requesterIds = (requests || []).map(r => r.requester_id);
    let profiles = [];
    if (requesterIds.length > 0) {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", requesterIds);
      profiles = profileData || [];
    }

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    const enriched = (requests || []).map(r => ({
      requesterId: r.requester_id,
      status: r.status,
      createdAt: r.created_at,
      username: profileMap[r.requester_id]?.username || null,
      displayName: profileMap[r.requester_id]?.display_name || null,
      avatarUrl: profileMap[r.requester_id]?.avatar_url || null,
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching pending follow requests:", error);
    res.status(500).json({ error: "Failed to fetch follow requests." });
  }
});

// POST /api/users/follow-requests/:requesterId/accept
router.post("/follow-requests/:requesterId/accept", requireAuth, async (req, res) => {
  const requesterId = req.params.requesterId;
  const currentUserId = req.userId;

  try {
    // Verify the request exists and is pending
    const { data: request, error: fetchError } = await supabase
      .from("follow_requests")
      .select("*")
      .eq("requester_id", requesterId)
      .eq("requested_user_id", currentUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return res.status(404).json({ error: "Follow request not found." });
    }

    // Create the follow relationship
    const { error: followError } = await supabase
      .from("user_follows")
      .insert({ follower_id: requesterId, following_id: currentUserId });

    if (followError && followError.code !== '23505') throw followError;

    // Delete the request row
    await supabase
      .from("follow_requests")
      .delete()
      .eq("requester_id", requesterId)
      .eq("requested_user_id", currentUserId);

    // Create notification for the requester
    try {
      const { data: acceptorProfile } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", currentUserId)
        .maybeSingle();

      await supabase.from("notifications").insert({
        user_id: requesterId,
        type: "follow_request_accepted",
        data: {
          acceptedBy: currentUserId,
          acceptedByUsername: acceptorProfile?.username || null,
        },
      });
    } catch (notifError) {
      console.error("Error creating follow request accepted notification:", notifError);
    }

    res.json({ message: "Follow request accepted." });
  } catch (error) {
    console.error("Error accepting follow request:", error);
    res.status(500).json({ error: "Failed to accept follow request." });
  }
});

// POST /api/users/follow-requests/:requesterId/deny
router.post("/follow-requests/:requesterId/deny", requireAuth, async (req, res) => {
  const requesterId = req.params.requesterId;
  const currentUserId = req.userId;

  try {
    const { data: request, error: fetchError } = await supabase
      .from("follow_requests")
      .select("*")
      .eq("requester_id", requesterId)
      .eq("requested_user_id", currentUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return res.status(404).json({ error: "Follow request not found." });
    }

    // Delete the request row
    await supabase
      .from("follow_requests")
      .delete()
      .eq("requester_id", requesterId)
      .eq("requested_user_id", currentUserId);

    res.json({ message: "Follow request denied." });
  } catch (error) {
    console.error("Error denying follow request:", error);
    res.status(500).json({ error: "Failed to deny follow request." });
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
    // Check target user's profile visibility
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("profile_visibility")
      .eq("user_id", followingId)
      .maybeSingle();

    if (prefs && prefs.profile_visibility === 'private') {
      // Private profile — create a follow request instead of instant follow
      const { error: reqError } = await supabase
        .from("follow_requests")
        .insert({ requester_id: followerId, requested_user_id: followingId, status: 'pending' });

      if (reqError) {
        if (reqError.code === '23505') {
          return res.status(409).json({ error: "Follow request already sent." });
        }
        throw reqError;
      }

      // Create notification for the target user
      try {
        const { data: requesterProfile } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("id", followerId)
          .maybeSingle();

        await supabase.from("notifications").insert({
          user_id: followingId,
          type: "follow_request",
          data: {
            requesterId: followerId,
            requesterUsername: requesterProfile?.username || null,
          },
        });
      } catch (notifError) {
        console.error("Error creating follow request notification:", notifError);
      }

      return res.json({ message: "Follow request sent.", status: "pending" });
    }

    // Public profile — instant follow
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

// DELETE /api/users/:id/follow-request — cancel a sent follow request
router.delete("/:id/follow-request", requireAuth, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.userId;

  try {
    const { error } = await supabase
      .from("follow_requests")
      .delete()
      .eq("requester_id", currentUserId)
      .eq("requested_user_id", targetUserId);

    if (error) throw error;

    res.json({ message: "Follow request cancelled." });
  } catch (error) {
    console.error("Error cancelling follow request:", error);
    res.status(500).json({ error: "Failed to cancel follow request." });
  }
});

// GET /api/users/:id/follow-request-status — check if current user has a pending request to this user
router.get("/:id/follow-request-status", requireAuth, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.userId;

  try {
    const { data, error } = await supabase
      .from("follow_requests")
      .select("status")
      .eq("requester_id", currentUserId)
      .eq("requested_user_id", targetUserId)
      .maybeSingle();

    if (error) throw error;

    res.json({ status: data ? data.status : 'none' });
  } catch (error) {
    console.error("Error checking follow request status:", error);
    res.status(500).json({ error: "Failed to check follow request status." });
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
