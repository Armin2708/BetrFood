const supabase = require('../db/supabase');

/**
 * Aggregate all personal data for a user into a single JSON object.
 * Used by both the synchronous export endpoint and the async scheduler.
 */
async function aggregateUserData(userId) {
  const [
    profileResult,
    prefsResult,
    postsResult,
    pantryResult,
    collectionsResult,
    likesResult,
    commentsResult,
    followersResult,
    followingResult,
  ] = await Promise.allSettled([
    supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('posts')
      .select('*, recipes(*, recipe_ingredients(*), recipe_steps(*)), post_tags(tags(*)), post_images(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('pantry_items').select('*').eq('user_id', userId),
    supabase.from('collections').select('*, collection_posts(post_id)').eq('user_id', userId),
    supabase.from('likes').select('post_id, created_at').eq('user_id', userId),
    supabase.from('comments').select('id, post_id, content, created_at').eq('user_id', userId),
    supabase.from('user_follows').select('follower_id').eq('following_id', userId),
    supabase.from('user_follows').select('following_id').eq('follower_id', userId),
  ]);

  const get = (result) => (result.status === 'fulfilled' ? result.value.data || null : null);

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    profile: get(profileResult),
    preferences: get(prefsResult),
    posts: get(postsResult) || [],
    pantry: get(pantryResult) || [],
    collections: get(collectionsResult) || [],
    likes: get(likesResult) || [],
    comments: get(commentsResult) || [],
    followers: (get(followersResult) || []).map((f) => f.follower_id),
    following: (get(followingResult) || []).map((f) => f.following_id),
  };
}

module.exports = { aggregateUserData };
