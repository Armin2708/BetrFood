const supabase = require('../db/supabase');

// Enrich posts with user profile data (display_name, username, avatar_url)
async function enrichPostsWithProfiles(posts) {
  if (!posts || posts.length === 0) return posts;

  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, verified, role')
    .in('id', userIds);

  const profileMap = {};
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.id] = p;
    }
  }

  return posts.map(post => {
    post._profile = profileMap[post.user_id] || null;
    return post;
  });
}

// Enrich posts with tags (batch fetch for all posts in one query)
async function enrichPostsWithTags(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: postTags, error } = await supabase
    .from('post_tags')
    .select('post_id, tag_id, tags(id, name, type)')
    .in('post_id', postIds);

  if (error) {
    console.error('Error fetching tags for posts:', error);
    return posts.map(post => { post._tags = []; return post; });
  }

  const tagMap = {};
  if (postTags) {
    for (const pt of postTags) {
      if (!tagMap[pt.post_id]) tagMap[pt.post_id] = [];
      if (pt.tags) {
        tagMap[pt.post_id].push(pt.tags);
      }
    }
  }

  return posts.map(post => {
    post._tags = tagMap[post.id] || [];
    return post;
  });
}

// Enrich posts with comment counts (batch query instead of N+1)
async function enrichPostsWithCommentCounts(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: comments, error } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);

  const countMap = {};
  if (!error && comments) {
    for (const c of comments) {
      countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
    }
  }

  return posts.map(post => {
    post._commentCount = countMap[post.id] || 0;
    return post;
  });
}

// Enrich posts with like counts and current user's like status (batch query instead of N+1)
async function enrichPostsWithLikes(posts, currentUserId) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: allLikes, error } = await supabase
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', postIds);

  const likeCountMap = {};
  const likedSet = new Set();

  if (!error && allLikes) {
    for (const like of allLikes) {
      likeCountMap[like.post_id] = (likeCountMap[like.post_id] || 0) + 1;
      if (currentUserId && like.user_id === currentUserId) {
        likedSet.add(like.post_id);
      }
    }
  }

  return posts.map(post => {
    post._likeCount = likeCountMap[post.id] || 0;
    post._liked = likedSet.has(post.id);
    return post;
  });
}

// Enrich posts with multiple images from post_images table
async function enrichPostsWithImages(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: postImages, error } = await supabase
    .from('post_images')
    .select('post_id, image_path, order_index')
    .in('post_id', postIds)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching post images:', error);
    return posts.map(post => { post._images = [post.image_path]; return post; });
  }

  const imageMap = {};
  if (postImages) {
    for (const img of postImages) {
      if (!imageMap[img.post_id]) imageMap[img.post_id] = [];
      imageMap[img.post_id].push(img.image_path);
    }
  }

  return posts.map(post => {
    post._images = imageMap[post.id] || [post.image_path];
    return post;
  });
}

// Enrich posts with recipe IDs (batch query to check which posts have recipes)
async function enrichPostsWithRecipes(posts) {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts.map(p => p.id);

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, post_id')
    .in('post_id', postIds);

  const recipeMap = {};
  if (!error && recipes) {
    for (const r of recipes) {
      recipeMap[r.post_id] = r.id;
    }
  }

  return posts.map(post => {
    post._recipeId = recipeMap[post.id] || null;
    return post;
  });
}

// Map Supabase snake_case to camelCase for frontend
function mapPost(post) {
  const profile = post._profile || {};
  const images = post._images || [post.image_path];
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    imagePath: images[0],
    images: images,
    mediaType: post.media_type || 'image',
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    editedAt: post.edited_at || null,
    displayName: profile.display_name || null,
    username: profile.username || null,
    avatarUrl: profile.avatar_url || null,
    verified: profile.verified || false,
    role: profile.role || 'user',
    commentCount: post._commentCount || 0,
    likeCount: post._likeCount || 0,
    liked: post._liked || false,
    tags: (post._tags || []).map(t => ({ id: t.id, name: t.name, type: t.type })),
    recipeId: post._recipeId || null,
  };
}

// Get user IDs that should be excluded from feeds (blocked + muted + users who blocked me)
async function getExcludedUserIds(currentUserId) {
  if (!currentUserId) return new Set();

  const [blockedByMe, mutedByMe, blockedMe] = await Promise.all([
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', currentUserId),
    supabase.from('user_mutes').select('muted_id').eq('muter_id', currentUserId),
    supabase.from('user_blocks').select('blocker_id').eq('blocked_id', currentUserId),
  ]);

  const excluded = new Set();
  if (blockedByMe.data) blockedByMe.data.forEach(r => excluded.add(r.blocked_id));
  if (mutedByMe.data) mutedByMe.data.forEach(r => excluded.add(r.muted_id));
  if (blockedMe.data) blockedMe.data.forEach(r => excluded.add(r.blocker_id));
  return excluded;
}

module.exports = {
  enrichPostsWithProfiles,
  enrichPostsWithTags,
  enrichPostsWithCommentCounts,
  enrichPostsWithLikes,
  enrichPostsWithImages,
  enrichPostsWithRecipes,
  mapPost,
  getExcludedUserIds,
};
