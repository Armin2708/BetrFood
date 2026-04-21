const supabase = require('./supabase');

/**
 * Record a post view impression
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @param {number} durationSeconds - How long user viewed the post
 */
async function recordPostImpression(userId, postId, durationSeconds) {
  const { data, error } = await supabase
    .from('post_impressions')
    .insert({
      post_id: postId,
      user_id: userId,
      view_start_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
      view_end_at: new Date().toISOString(),
      duration_seconds: Math.max(1, durationSeconds),
    });

  if (error) throw error;
  return data;
}

/**
 * Record negative feedback on a post
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @param {string} feedbackType - Type of feedback ('not_interested' or 'not_relevant')
 */
async function recordNegativeFeedback(userId, postId, feedbackType = 'not_interested') {
  const { data, error } = await supabase
    .from('post_negative_feedback')
    .upsert(
      {
        post_id: postId,
        user_id: userId,
        feedback_type: feedbackType,
      },
      { onConflict: 'post_id,user_id' }
    );

  if (error) throw error;
  return data;
}

/**
 * Check if user has given negative feedback on a post
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 */
async function hasNegativeFeedback(userId, postId) {
  const { data, error } = await supabase
    .from('post_negative_feedback')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return !!data;
}

/**
 * Get all post IDs that user has given negative feedback on
 * @param {string} userId - User ID
 */
async function getNegativeFeedbackPostIds(userId) {
  const { data, error } = await supabase
    .from('post_negative_feedback')
    .select('post_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(d => d.post_id);
}

/**
 * Remove negative feedback from a post (user changes mind)
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 */
async function removeNegativeFeedback(userId, postId) {
  const { error } = await supabase
    .from('post_negative_feedback')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get user's recent interactions (likes, saves, comments) grouped by tag
 * Used for preference vector calculation
 * @param {string} userId - User ID
 * @param {number} daysBack - How many days to look back (default 30)
 */
async function getUserRecentInteractions(userId, daysBack = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Get liked posts with their tags
  const { data: likedPostTags, error: likeError } = await supabase
    .from('likes')
    .select(`
      post_id,
      created_at,
      posts!inner (
        id,
        post_tags!inner (
          tag_id,
          tags!inner (
            name,
            type
          )
        )
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString());

  if (likeError) throw likeError;

  // Get saved posts with their tags
  const { data: savedPosts, error: saveError } = await supabase
    .from('collection_posts')
    .select(`
      collection_id,
      created_at,
      posts!inner (
        id,
        post_tags!inner (
          tag_id,
          tags!inner (
            name,
            type
          )
        )
      ),
      collections!inner (
        user_id
      )
    `)
    .eq('collections.user_id', userId)
    .gte('created_at', cutoffDate.toISOString());

  if (saveError) throw saveError;

  // Get commented posts with their tags
  const { data: commentedPostTags, error: commentError } = await supabase
    .from('comments')
    .select(`
      post_id,
      created_at,
      posts!inner (
        id,
        post_tags!inner (
          tag_id,
          tags!inner (
            name,
            type
          )
        )
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString());

  if (commentError) throw commentError;

  return {
    likes: likedPostTags || [],
    saves: savedPosts || [],
    comments: commentedPostTags || [],
  };
}

/**
 * Get engagement metrics for a user
 * @param {string} userId - User ID
 */
async function getUserEngagementMetrics(userId) {
  // Recent interactions (7 days)
  const { data: recentImpressions } = await supabase
    .from('post_impressions')
    .select('duration_seconds')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Total interactions (lifetime)
  const { count: totalLikes = 0 } = await supabase
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: totalComments = 0 } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: totalSaves = 0 } = await supabase
    .from('collection_posts')
    .select('id', { count: 'exact', head: true })
    .eq('collections.user_id', userId);

  const totalInteractionCount = (totalLikes || 0)
    + (totalComments || 0)
    + (totalSaves || 0);

  const avgViewDuration = recentImpressions && recentImpressions.length > 0
    ? recentImpressions.reduce((sum, imp) => sum + (imp.duration_seconds || 0), 0) / recentImpressions.length
    : 0;

  return {
    recentInteractionCount: recentImpressions?.length || 0,
    totalInteractionCount,
    avgViewDuration: Math.round(avgViewDuration),
  };
}

module.exports = {
  recordPostImpression,
  recordNegativeFeedback,
  hasNegativeFeedback,
  getNegativeFeedbackPostIds,
  removeNegativeFeedback,
  getUserRecentInteractions,
  getUserEngagementMetrics,
};
