const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const supabase = require('../db/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  enrichPostsWithProfiles,
  enrichPostsWithTags,
  enrichPostsWithCommentCounts,
  enrichPostsWithLikes,
  enrichPostsWithImages,
  enrichPostsWithRecipes,
  mapPost,
  getExcludedUserIds,
} = require('../utils/enrichment');
const {
  calculatePostRelevanceScore,
  getUserPreferenceVector,
} = require('../utils/recommendationEngine');
const {
  getNegativeFeedbackPostIds,
} = require('../db/interactions');

// Compress video to 720p MP4
function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

// Upload a local file to Supabase Storage and return its public URL
async function uploadToSupabaseStorage(localPath, filename, mimeType) {
  const fileBuffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage
    .from('post-media')
    .upload(filename, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from('post-media')
    .getPublicUrl(filename);
  return publicUrl;
}

// Delete a file from Supabase Storage by its public URL or path
async function deleteFromSupabaseStorage(urlOrPath) {
  try {
    let filename = urlOrPath;
    if (urlOrPath.includes('/post-media/')) {
      filename = urlOrPath.split('/post-media/').pop();
    } else if (urlOrPath.startsWith('/uploads/')) {
      return;
    }
    await supabase.storage.from('post-media').remove([filename]);
  } catch (err) {
    console.error('Failed to delete from Supabase Storage:', err.message);
  }
}

const { requireRole, requireMinRole } = require('../middleware/rbac');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedImages = /jpeg|jpg|png|gif|webp|heif|heic/;
const allowedVideos = /mp4|mov|quicktime|webm/;

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeSub = file.mimetype.split('/')[1];
    const isImage = allowedImages.test(mimeSub) && (ext ? allowedImages.test(ext) : true);
    const isVideo = file.mimetype.startsWith('video/') && (ext ? allowedVideos.test(ext) : true);
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only image (jpeg, jpg, png, gif, webp, heif, heic) and video (mp4, mov, webm) files are allowed'));
    }
  },
});

async function getExplicitRecommendationPreferences(userId) {
  const [preferencesResult, profileResult] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('dietary_preferences, cuisines, cooking_skill, max_cook_time')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('dietary_preferences')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  if (preferencesResult.error) {
    console.warn('Failed to fetch explicit user preferences:', preferencesResult.error.message);
  }
  if (profileResult.error) {
    console.warn('Failed to fetch profile dietary preferences:', profileResult.error.message);
  }

  return {
    ...(preferencesResult.data || {}),
    profile_dietary_preferences: profileResult.data?.dietary_preferences || [],
  };
}

const EXPLORE_SECTION_DEFINITIONS = {
  trending: {
    id: 'trending',
    title: 'Trending Now',
    description: 'Fresh posts getting the most conversation right now.',
    type: 'posts',
  },
  popular_week: {
    id: 'popular_week',
    title: 'Popular This Week',
    description: 'The food everyone has been liking, saving, and talking about.',
    type: 'posts',
  },
  based_on_preferences: {
    id: 'based_on_preferences',
    title: 'Based on Preferences',
    description: 'Picked from your dietary and cuisine preferences.',
    type: 'posts',
  },
  following: {
    id: 'following',
    title: 'New from Creators You Follow',
    description: 'Latest posts from people you follow.',
    type: 'posts',
  },
  categories: {
    id: 'categories',
    title: 'Categories',
    description: 'Browse cuisines, meal types, and dietary tags.',
    type: 'categories',
  },
};

function getCategoryDescription(tag) {
  if (tag.type === 'cuisine') return `Explore ${tag.name} recipes and food ideas.`;
  if (tag.type === 'meal') return `Find ${tag.name.toLowerCase()} inspiration.`;
  if (tag.type === 'dietary') return `Browse posts that fit ${tag.name.toLowerCase()} preferences.`;
  return `Browse posts tagged ${tag.name}.`;
}

async function filterVisiblePosts(posts, currentUserId) {
  if (!posts || posts.length === 0) return [];

  const excludedIds = currentUserId ? await getExcludedUserIds(currentUserId) : new Set();
  let filteredPosts = excludedIds.size > 0
    ? posts.filter(p => !excludedIds.has(p.user_id))
    : posts;

  if (filteredPosts.length === 0) return [];

  const postUserIds = [...new Set(filteredPosts.map(p => p.user_id))];
  const { data: privatePrefs } = await supabase
    .from('user_preferences')
    .select('user_id')
    .in('user_id', postUserIds)
    .eq('profile_visibility', 'private');

  const privateUserIds = new Set((privatePrefs || []).map(p => p.user_id));
  if (privateUserIds.size === 0) return filteredPosts;

  let followingIds = new Set();
  if (currentUserId) {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', [...privateUserIds]);
    followingIds = new Set((follows || []).map(f => f.following_id));
  }

  return filteredPosts.filter(p => {
    if (!privateUserIds.has(p.user_id)) return true;
    if (p.user_id === currentUserId) return true;
    return followingIds.has(p.user_id);
  });
}

async function getSaveCountMap(postIds) {
  if (!postIds || postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('collection_posts')
    .select('post_id')
    .in('post_id', postIds);

  if (error) {
    console.warn('Failed to fetch save counts:', error.message);
    return {};
  }

  return (data || []).reduce((counts, row) => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    return counts;
  }, {});
}

async function enrichAndMapPosts(posts, currentUserId) {
  let enriched = await enrichPostsWithProfiles(posts);
  enriched = await enrichPostsWithTags(enriched);
  enriched = await enrichPostsWithCommentCounts(enriched);
  enriched = await enrichPostsWithLikes(enriched, currentUserId);
  enriched = await enrichPostsWithImages(enriched);
  enriched = await enrichPostsWithRecipes(enriched);
  return enriched;
}

function sortPostsByEngagement(posts, saveCountMap = {}) {
  return [...posts].sort((a, b) => {
    const aScore = (a._likeCount || 0) + (a._commentCount || 0) + (saveCountMap[a.id] || 0);
    const bScore = (b._likeCount || 0) + (b._commentCount || 0) + (saveCountMap[b.id] || 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

async function fetchExplorePostSection(sectionId, currentUserId, limit, offset) {
  const candidateLimit = Math.max(limit + offset + 25, 75);
  let query = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(candidateLimit);

  if (sectionId === 'popular_week') {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', oneWeekAgo);
  }

  if (sectionId === 'following') {
    if (!currentUserId) return { posts: [], hasMore: false };
    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (followError) throw followError;
    const followingIds = (follows || []).map(f => f.following_id);
    if (followingIds.length === 0) return { posts: [], hasMore: false };
    query = query.in('user_id', followingIds);
  }

  const { data: rawPosts, error } = await query;
  if (error) throw error;

  const visiblePosts = await filterVisiblePosts(rawPosts || [], currentUserId);
  let enriched = await enrichAndMapPosts(visiblePosts, currentUserId);
  const saveCountMap = await getSaveCountMap(enriched.map(post => post.id));

  if (sectionId === 'based_on_preferences' && currentUserId) {
    try {
      const explicitPreferences = await getExplicitRecommendationPreferences(currentUserId);
      const userPrefVector = await getUserPreferenceVector(currentUserId, explicitPreferences);
      const notInterestedPostIds = await getNegativeFeedbackPostIds(currentUserId);
      const notInterestedSet = new Set(notInterestedPostIds);

      enriched = enriched
        .map(post => ({
          ...post,
          _recommendationScore: calculatePostRelevanceScore(
            { ...mapPost(post), hasNegativeFeedback: notInterestedSet.has(post.id) },
            userPrefVector
          ),
        }))
        .sort((a, b) => {
          if (Math.abs((b._recommendationScore || 0) - (a._recommendationScore || 0)) > 0.01) {
            return (b._recommendationScore || 0) - (a._recommendationScore || 0);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
    } catch (err) {
      console.warn('Explore preference scoring failed:', err.message);
      enriched = sortPostsByEngagement(enriched, saveCountMap);
    }
  } else if (sectionId === 'trending' || sectionId === 'popular_week') {
    enriched = sortPostsByEngagement(enriched, saveCountMap);
  }

  const paginated = enriched.slice(offset, offset + limit);
  return {
    posts: paginated.map(mapPost),
    hasMore: offset + paginated.length < enriched.length,
  };
}

async function fetchExploreCategories(limit, offset) {
  const { data, error } = await supabase
    .from('post_tags')
    .select('tag_id, tags(id, name, type)');

  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    if (!row.tags) continue;
    const id = row.tags.id;
    if (!counts[id]) {
      counts[id] = { ...row.tags, postCount: 0, description: getCategoryDescription(row.tags) };
    }
    counts[id].postCount++;
  }

  const categories = Object.values(counts)
    .sort((a, b) => {
      if (b.postCount !== a.postCount) return b.postCount - a.postCount;
      return a.name.localeCompare(b.name);
    });

  const paginated = categories.slice(offset, offset + limit);
  return {
    categories: paginated,
    hasMore: offset + paginated.length < categories.length,
  };
}

async function buildExploreSection(sectionId, currentUserId, limit = 10, offset = 0) {
  const definition = EXPLORE_SECTION_DEFINITIONS[sectionId];
  if (!definition) return null;

  if (definition.type === 'categories') {
    const { categories, hasMore } = await fetchExploreCategories(limit, offset);
    return { ...definition, categories, hasMore };
  }

  const { posts, hasMore } = await fetchExplorePostSection(sectionId, currentUserId, limit, offset);
  return { ...definition, posts, hasMore };
}

// GET /api/posts - cursor-based paginated feed
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const cursor = req.query.cursor || null;

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cursorPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', cursor)
        .single();

      if (!cursorPost) {
        return res.json({ posts: [], nextCursor: null, hasMore: false });
      }
      query = query.lt('created_at', cursorPost.created_at);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const excludedIds = req.userId ? await getExcludedUserIds(req.userId) : new Set();
    let filteredPosts = excludedIds.size > 0
      ? posts.filter(p => !excludedIds.has(p.user_id))
      : posts;

    if (filteredPosts.length > 0) {
      const postUserIds = [...new Set(filteredPosts.map(p => p.user_id))];

      const { data: privatePrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('user_id', postUserIds)
        .eq('profile_visibility', 'private');

      const privateUserIds = new Set((privatePrefs || []).map(p => p.user_id));

      if (privateUserIds.size > 0) {
        let followingIds = new Set();
        if (req.userId) {
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', req.userId)
            .in('following_id', [...privateUserIds]);
          followingIds = new Set((follows || []).map(f => f.following_id));
        }

        filteredPosts = filteredPosts.filter(p => {
          if (!privateUserIds.has(p.user_id)) return true;
          if (p.user_id === req.userId) return true;
          return followingIds.has(p.user_id);
        });
      }
    }

    const hasMore = filteredPosts.length > limit;
    const resultPosts = hasMore ? filteredPosts.slice(0, limit) : filteredPosts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    const enriched = await enrichPostsWithProfiles(resultPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const withRecipes = await enrichPostsWithRecipes(withImages);
    const mapped = withRecipes.map(mapPost);

    let finalPosts = mapped;
    if (req.userId && mapped.length > 0) {
      try {
        const explicitPreferences = await getExplicitRecommendationPreferences(req.userId);
        const userPrefVector = await getUserPreferenceVector(req.userId, explicitPreferences);
        const notInterestedPostIds = await getNegativeFeedbackPostIds(req.userId);
        const notInterestedSet = new Set(notInterestedPostIds);

        finalPosts = mapped.map(post => ({
          ...post,
          recommendationScore: calculatePostRelevanceScore(
            { ...post, hasNegativeFeedback: notInterestedSet.has(post.id) },
            userPrefVector
          ),
        }));

        finalPosts.sort((a, b) => {
          if (Math.abs(a.recommendationScore - b.recommendationScore) > 0.01) {
            return b.recommendationScore - a.recommendationScore;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        finalPosts = finalPosts.map(({ recommendationScore, ...post }) => post);
      } catch (err) {
        console.warn('Recommendation scoring failed, falling back to chronological:', err.message);
      }
    }

    res.json({ posts: finalPosts, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/posts/explore - Curated Explore sections for discovery.
router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 5), 20);
    const sectionIds = ['trending', 'popular_week', 'based_on_preferences', 'following', 'categories'];
    const sections = await Promise.all(
      sectionIds.map(sectionId => buildExploreSection(sectionId, req.userId, limit, 0))
    );

    res.json({ sections: sections.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching explore sections:', error);
    res.status(500).json({ error: 'Failed to fetch explore sections.' });
  }
});

// GET /api/posts/explore/:sectionId - Paginated data for "See All" screens.
router.get('/explore/:sectionId', optionalAuth, async (req, res) => {
  try {
    const { sectionId } = req.params;
    if (!EXPLORE_SECTION_DEFINITIONS[sectionId]) {
      return res.status(404).json({ error: 'Explore section not found.' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const section = await buildExploreSection(sectionId, req.userId, limit, offset);

    res.json({ section, offset, limit });
  } catch (error) {
    console.error('Error fetching explore section:', error);
    res.status(500).json({ error: 'Failed to fetch explore section.' });
  }
});

// GET /api/posts/autocomplete?q=chi
// Returns up to 8 suggestions across three buckets:
//   trending  - popular past searches matching the prefix
//   tags      - tag names matching the prefix
//   captions  - post captions starting with or containing the query
// Also records the query in search_queries for trending tracking.
router.get('/autocomplete', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Run all three lookups in parallel for speed
    const [trendingResult, tagsResult, captionsResult] = await Promise.allSettled([
      // Trending: past searches starting with q, ranked by hit_count then recency
      supabase
        .from('search_queries')
        .select('query_text, hit_count')
        .ilike('query_text', `${q}%`)
        .order('hit_count', { ascending: false })
        .order('last_searched_at', { ascending: false })
        .limit(4),

      // Tags: tag names that start with the query (case-insensitive)
      supabase
        .from('tags')
        .select('id, name, type')
        .ilike('name', `${q}%`)
        .order('name')
        .limit(4),

      // Captions: post captions containing the query, ordered by recency
      supabase
        .from('posts')
        .select('id, caption')
        .ilike('caption', `%${q}%`)
        .not('caption', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const trending = trendingResult.status === 'fulfilled'
      ? (trendingResult.value.data || [])
      : [];

    const tags = tagsResult.status === 'fulfilled'
      ? (tagsResult.value.data || [])
      : [];

    const captions = captionsResult.status === 'fulfilled'
      ? (captionsResult.value.data || [])
      : [];

    // Build deduplicated suggestion list
    // Priority: trending > tags > captions
    const seen = new Set();
    const suggestions = [];

    for (const t of trending) {
      const text = t.query_text.toLowerCase();
      if (!seen.has(text)) {
        seen.add(text);
        suggestions.push({ type: 'trending', text: t.query_text });
      }
    }

    for (const tag of tags) {
      const text = tag.name.toLowerCase();
      if (!seen.has(text)) {
        seen.add(text);
        suggestions.push({ type: 'tag', text: tag.name, tagType: tag.type });
      }
    }

    for (const post of captions) {
      if (!post.caption) continue;
      // Truncate long captions to first 60 chars for display
      const display = post.caption.length > 60
        ? post.caption.slice(0, 60).trim() + '…'
        : post.caption;
      const text = display.toLowerCase();
      if (!seen.has(text) && suggestions.length < 8) {
        seen.add(text);
        suggestions.push({ type: 'caption', text: display });
      }
    }

    res.json({ suggestions: suggestions.slice(0, 8) });
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error);
    // Autocomplete errors should never break the search flow — return empty
    res.json({ suggestions: [] });
  }
});

// POST /api/posts/autocomplete/record
// Records a completed search query to the trending index.
// Called by the frontend when the user actually executes a search.
router.post('/autocomplete/record', optionalAuth, async (req, res) => {
  try {
    const q = (req.body.query || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ ok: true });

    // Upsert: increment hit_count and update last_searched_at if exists
    await supabase.rpc('record_search_query', { p_query: q });

    res.json({ ok: true });
  } catch (error) {
    // Non-critical — don't surface this error to the client
    console.error('Error recording search query:', error);
    res.json({ ok: true });
  }
});

// GET /api/posts/for-you
// Personalized feed combining content-based and collaborative filtering.
// Algorithm:
//   1. Fetch a candidate pool of recent posts (5× the requested limit)
//   2. Filter blocked users, private accounts, and "not interested" posts
//   3. Score each post:
//        - Tag preference match (50%) — from user's stored preference vector
//        - Follow boost (+0.10) — posts by followed creators score higher
//        - Collaborative boost (+0.08) — posts by users who share tag affinities
//        - Popularity (15%) — likes normalised to 100
//        - Recency (15%) — logarithmic decay over 24 hours
//        - Not-interested penalty (−0.20)
//   4. Return top `limit` posts sorted by score, with cursor for next page
router.get('/for-you', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 30);
    const cursor = req.query.cursor || null;
    const poolSize = limit * 5;

    // Parallel fetches: preference vector, exclusions, negative feedback, follows
    const [userPrefVector, excludedIds, notInterestedPostIds, followsResult] =
      await Promise.all([
        getUserPreferenceVector(req.userId).catch(() => null),
        getExcludedUserIds(req.userId),
        getNegativeFeedbackPostIds(req.userId).catch(() => []),
        supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', req.userId),
      ]);

    const followedIds = new Set(
      (followsResult.data || []).map((f) => f.following_id)
    );
    const notInterestedSet = new Set(notInterestedPostIds);

    // Collaborative filtering: find users whose liked-post tags overlap with ours.
    // We pull the user's top liked-post tag IDs, then find other likers of those posts.
    let collaborativeUserIds = new Set();
    try {
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', req.userId)
        .limit(50);

      if (userLikes && userLikes.length > 0) {
        const likedPostIds = userLikes.map((l) => l.post_id);

        const { data: ptRows } = await supabase
          .from('post_tags')
          .select('tag_id')
          .in('post_id', likedPostIds);

        if (ptRows && ptRows.length > 0) {
          const tagFreq = {};
          for (const { tag_id } of ptRows) {
            tagFreq[tag_id] = (tagFreq[tag_id] || 0) + 1;
          }
          const topTagIds = Object.entries(tagFreq)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => parseInt(id));

          const { data: tagPostRows } = await supabase
            .from('post_tags')
            .select('post_id')
            .in('tag_id', topTagIds)
            .limit(300);

          if (tagPostRows && tagPostRows.length > 0) {
            const tagPostIds = tagPostRows.map((r) => r.post_id);

            const { data: similarLikers } = await supabase
              .from('likes')
              .select('user_id')
              .in('post_id', tagPostIds)
              .neq('user_id', req.userId)
              .limit(100);

            const freq = {};
            for (const { user_id } of similarLikers || []) {
              freq[user_id] = (freq[user_id] || 0) + 1;
            }
            collaborativeUserIds = new Set(
              Object.entries(freq)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 30)
                .map(([uid]) => uid)
            );
          }
        }
      }
    } catch {
      // Non-critical — proceed without collaborative boost
    }

    // Fetch candidate pool of recent posts
    let query = supabase
      .from('posts')
      .select('*')
      .neq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(poolSize + 1);

    if (cursor) {
      const { data: cursorPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', cursor)
        .single();

      if (!cursorPost) {
        return res.json({ posts: [], nextCursor: null, hasMore: false });
      }
      query = query.lt('created_at', cursorPost.created_at);
    }

    const { data: rawPosts, error } = await query;
    if (error) throw error;

    // Filter blocked users + private accounts (same logic as general feed)
    let candidates = excludedIds.size > 0
      ? rawPosts.filter((p) => !excludedIds.has(p.user_id))
      : rawPosts;

    if (candidates.length > 0) {
      const postUserIds = [...new Set(candidates.map((p) => p.user_id))];
      const { data: privatePrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('user_id', postUserIds)
        .eq('profile_visibility', 'private');

      const privateUserIds = new Set((privatePrefs || []).map((p) => p.user_id));
      if (privateUserIds.size > 0) {
        candidates = candidates.filter((p) => {
          if (!privateUserIds.has(p.user_id)) return true;
          return followedIds.has(p.user_id);
        });
      }
    }

    const hasMoreCandidates = candidates.length > poolSize;
    const pool = hasMoreCandidates ? candidates.slice(0, poolSize) : candidates;

    // Enrich with tags, profiles, likes, etc.
    let enriched = await enrichPostsWithProfiles(pool);
    enriched = await enrichPostsWithTags(enriched);
    enriched = await enrichPostsWithCommentCounts(enriched);
    enriched = await enrichPostsWithLikes(enriched, req.userId);
    enriched = await enrichPostsWithImages(enriched);
    enriched = await enrichPostsWithRecipes(enriched);
    const mapped = enriched.map(mapPost);

    // Score and rank
    const scored = mapped.map((post) => {
      let score = userPrefVector
        ? calculatePostRelevanceScore(
            { ...post, hasNegativeFeedback: notInterestedSet.has(post.id) },
            userPrefVector,
            { tagWeight: 0.50, engagementWeight: 0.15, recencyWeight: 0.15, historyWeight: 0.10, negativeFeedbackPenalty: 0.20 }
          )
        : 0.5;

      // Boost posts from followed creators (discovery still surfaces them higher)
      if (followedIds.has(post.userId)) score = Math.min(1, score + 0.10);

      // Collaborative filtering boost
      if (collaborativeUserIds.has(post.userId)) score = Math.min(1, score + 0.08);

      return { ...post, _score: score };
    });

    // Filter out not-interested posts after scoring (they get penalised above, but remove very low scores)
    const filtered = scored.filter((p) => !notInterestedSet.has(p.id) || p._score > 0.1);

    filtered.sort((a, b) => b._score - a._score);

    const results = filtered.slice(0, limit).map(({ _score, ...post }) => post);

    // Cursor points to the last post in the raw pool (not the ranked results) so
    // next page fetches the next chronological window for re-ranking.
    const lastPoolPost = pool[pool.length - 1];
    const nextCursor = hasMoreCandidates && lastPoolPost ? lastPoolPost.id : null;
    const hasMore = Boolean(nextCursor);

    res.json({ posts: results, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching for-you feed:', error);
    res.status(500).json({ error: 'Failed to fetch For You feed.' });
  }
});

// GET /api/posts/search
// Query params:
//   q          - required, search keywords
//   limit      - default 20, max 50
//   offset     - default 0
//   tagIds     - comma-separated tag IDs (e.g. "1,3,5")
//   difficulty - "easy" | "medium" | "hard"
//   cookTime   - max cook time in minutes (e.g. "30")
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const tagIds = req.query.tagIds
      ? req.query.tagIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : [];
    const difficulty = req.query.difficulty || null;
    const cookTime = req.query.cookTime ? parseInt(req.query.cookTime) : null;

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be easy, medium, or hard.' });
    }

    const { data: searchResults, error: searchError } = await supabase.rpc('search_posts', {
      search_query: q,
      result_limit: 200,
      result_offset: offset,
    });

    if (searchError) throw searchError;

    let posts = searchResults || [];

    if (tagIds.length > 0) {
      const postIds = posts.map(p => p.id);
      if (postIds.length > 0) {
        const { data: postTagRows, error: ptError } = await supabase
          .from('post_tags')
          .select('post_id, tag_id')
          .in('post_id', postIds)
          .in('tag_id', tagIds);

        if (ptError) throw ptError;

        const matchCounts = {};
        for (const row of (postTagRows || [])) {
          if (!matchCounts[row.post_id]) matchCounts[row.post_id] = new Set();
          matchCounts[row.post_id].add(row.tag_id);
        }

        const validPostIds = new Set(
          Object.entries(matchCounts)
            .filter(([, tags]) => tags.size === tagIds.length)
            .map(([postId]) => postId)
        );

        posts = posts.filter(p => validPostIds.has(p.id));
      } else {
        posts = [];
      }
    }

    if (difficulty || cookTime !== null) {
      const postIds = posts.map(p => p.id);
      if (postIds.length > 0) {
        let recipeQuery = supabase
          .from('recipes')
          .select('post_id, difficulty, cook_time')
          .in('post_id', postIds);

        if (difficulty) recipeQuery = recipeQuery.eq('difficulty', difficulty);
        if (cookTime !== null) recipeQuery = recipeQuery.lte('cook_time', cookTime);

        const { data: matchingRecipes, error: recipeError } = await recipeQuery;
        if (recipeError) throw recipeError;

        const validPostIds = new Set((matchingRecipes || []).map(r => r.post_id));
        posts = posts.filter(p => validPostIds.has(p.id));
      } else {
        posts = [];
      }
    }

    const totalFiltered = posts.length;
    const paginated = posts.slice(0, limit);

    const excludedIds = req.userId ? await getExcludedUserIds(req.userId) : new Set();
    let filteredPosts = excludedIds.size > 0
      ? paginated.filter(p => !excludedIds.has(p.user_id))
      : paginated;

    if (filteredPosts.length > 0) {
      const postUserIds = [...new Set(filteredPosts.map(p => p.user_id))];
      const { data: privatePrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('user_id', postUserIds)
        .eq('profile_visibility', 'private');

      const privateUserIds = new Set((privatePrefs || []).map(p => p.user_id));

      if (privateUserIds.size > 0) {
        let followingIds = new Set();
        if (req.userId) {
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', req.userId)
            .in('following_id', [...privateUserIds]);
          followingIds = new Set((follows || []).map(f => f.following_id));
        }
        filteredPosts = filteredPosts.filter(p => {
          if (!privateUserIds.has(p.user_id)) return true;
          if (p.user_id === req.userId) return true;
          return followingIds.has(p.user_id);
        });
      }
    }

    const enriched = await enrichPostsWithProfiles(filteredPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const withRecipes = await enrichPostsWithRecipes(withImages);
    const mapped = withRecipes.map(mapPost);

    res.json({
      posts: mapped,
      total: mapped.length,
      hasMore: totalFiltered > limit,
      offset,
      limit,
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ error: 'Failed to search posts.' });
  }
});

// GET /api/posts/following - Feed of posts from followed users (auth required)
router.get('/following', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const cursor = req.query.cursor || null;

    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', req.userId);

    if (followError) throw followError;

    if (!follows || follows.length === 0) {
      return res.json({ posts: [], nextCursor: null, hasMore: false });
    }

    const followingIds = follows.map(f => f.following_id);

    let query = supabase
      .from('posts')
      .select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cursorPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', cursor)
        .single();

      if (!cursorPost) {
        return res.json({ posts: [], nextCursor: null, hasMore: false });
      }
      query = query.lt('created_at', cursorPost.created_at);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const excludedIds = await getExcludedUserIds(req.userId);
    const filteredPosts = excludedIds.size > 0
      ? posts.filter(p => !excludedIds.has(p.user_id))
      : posts;

    const hasMore = filteredPosts.length > limit;
    const resultPosts = hasMore ? filteredPosts.slice(0, limit) : filteredPosts;
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].id
      : null;

    const enriched = await enrichPostsWithProfiles(resultPosts);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withLikes = await enrichPostsWithLikes(withCounts, req.userId);
    const withImages = await enrichPostsWithImages(withLikes);
    const withRecipes = await enrichPostsWithRecipes(withImages);
    const mapped = withRecipes.map(mapPost);

    res.json({ posts: mapped, nextCursor, hasMore });
  } catch (error) {
    console.error('Error fetching following feed:', error);
    res.status(500).json({ error: 'Failed to fetch following feed.' });
  }
});

// GET /api/posts/liked — fetch posts liked by a user
router.get('/liked', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    const { data: likeRows, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .limit(limit);

    if (likesError) throw likesError;
    if (!likeRows || likeRows.length === 0) return res.json({ posts: [] });

    const postIds = likeRows.map(r => r.post_id);

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);

    if (postsError) throw postsError;

    const postMap = new Map((posts || []).map(p => [p.id, p]));
    let ordered = postIds.map(id => postMap.get(id)).filter(Boolean);

    ordered = await enrichPostsWithProfiles(ordered);
    ordered = await enrichPostsWithTags(ordered);
    ordered = await enrichPostsWithCommentCounts(ordered);
    ordered = await enrichPostsWithLikes(ordered, req.userId);
    ordered = await enrichPostsWithImages(ordered);
    ordered = await enrichPostsWithRecipes(ordered);

    res.json({ posts: ordered.map(mapPost) });
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    res.status(500).json({ error: 'Failed to fetch liked posts.' });
  }
});

// GET /api/posts/user/:userId - get posts by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 50);

    const excludedIds = req.userId ? await getExcludedUserIds(req.userId) : new Set();
    if (excludedIds.has(req.params.userId)) {
      return res.json({ posts: [] });
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const enriched = await enrichPostsWithProfiles(posts || []);
    const withTags = await enrichPostsWithTags(enriched);
    const withCounts = await enrichPostsWithCommentCounts(withTags);
    const withRecipes = await enrichPostsWithRecipes(withCounts);
    const mapped = withRecipes.map(mapPost);

    res.json({ posts: mapped });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts.' });
  }
});

// GET /api/posts/:id - single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    if (req.userId) {
      const excludedIds = await getExcludedUserIds(req.userId);
      if (excludedIds.has(post.user_id)) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }

    const [enriched] = await enrichPostsWithProfiles([post]);
    const [withTags] = await enrichPostsWithTags([enriched]);
    const [withCount] = await enrichPostsWithCommentCounts([withTags]);
    const [withImages] = await enrichPostsWithImages([withCount]);
    const [withRecipe] = await enrichPostsWithRecipes([withImages]);
    res.json(mapPost(withRecipe));
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts - create post with image upload (auth required)
router.post('/', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ error: 'At least one image or video is required' });
    }

    const videoFiles = files.filter(f => f.mimetype.startsWith('video/'));
    if (videoFiles.length > 1) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ error: 'Only one video per post is allowed.' });
    }
    if (videoFiles.length > 0 && files.length > 1) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ error: 'A video post cannot include other media.' });
    }
    for (const file of videoFiles) {
      if (file.size > 50 * 1024 * 1024) {
        files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
        return res.status(400).json({ error: 'Video files must be under 50MB (max ~20 seconds).' });
      }
    }

    const mediaPaths = [];
    let detectedMediaType = 'image';

    for (const file of files) {
      if (file.mimetype.startsWith('video/')) {
        detectedMediaType = 'video';
        const compressedFilename = `${uuidv4()}.mp4`;
        const compressedPath = path.join(uploadsDir, compressedFilename);
        try {
          await compressVideo(file.path, compressedPath);
          fs.unlinkSync(file.path);
          const publicUrl = await uploadToSupabaseStorage(compressedPath, compressedFilename, 'video/mp4');
          fs.unlinkSync(compressedPath);
          mediaPaths.push(publicUrl);
        } catch (err) {
          console.error('Video processing/upload failed:', err.message);
          try {
            const publicUrl = await uploadToSupabaseStorage(file.path, file.filename, file.mimetype);
            fs.unlinkSync(file.path);
            mediaPaths.push(publicUrl);
          } catch (uploadErr) {
            console.error('Fallback upload also failed:', uploadErr.message);
            try { fs.unlinkSync(file.path); } catch {}
          }
        }
      } else {
        const optimizedFilename = `${uuidv4()}.jpg`;
        const optimizedPath = path.join(uploadsDir, optimizedFilename);
        let uploadPath = file.path;
        let uploadFilename = file.filename;
        let uploadMime = file.mimetype;
        try {
          await sharp(file.path)
            .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(optimizedPath);
          fs.unlinkSync(file.path);
          uploadPath = optimizedPath;
          uploadFilename = optimizedFilename;
          uploadMime = 'image/jpeg';
        } catch (sharpErr) {
          console.error('Image compression failed, using original:', sharpErr.message);
        }
        try {
          const publicUrl = await uploadToSupabaseStorage(uploadPath, uploadFilename, uploadMime);
          fs.unlinkSync(uploadPath);
          mediaPaths.push(publicUrl);
        } catch (uploadErr) {
          console.error('Image upload to Supabase Storage failed:', uploadErr.message);
          try { fs.unlinkSync(uploadPath); } catch {}
        }
      }
    }

    if (mediaPaths.length === 0) {
      return res.status(500).json({ error: 'Failed to upload media files.' });
    }

    const caption = (req.body.caption || '').slice(0, 500);
    const now = new Date().toISOString();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        caption,
        image_path: mediaPaths[0],
        media_type: detectedMediaType,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    if (mediaPaths.length > 0) {
      const imageRows = mediaPaths.map((imgPath, idx) => ({
        post_id: post.id,
        image_path: imgPath,
        order_index: idx,
      }));
      await supabase.from('post_images').insert(imageRows);
    }

    let recipeData = null;
    if (req.body.recipe) {
      try {
        const recipe = typeof req.body.recipe === 'string'
          ? JSON.parse(req.body.recipe)
          : req.body.recipe;

        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            post_id: post.id,
            cook_time: recipe.cookTime || null,
            servings: recipe.servings || null,
            difficulty: recipe.difficulty || null,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (recipeError) throw recipeError;

        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const ingredientRows = recipe.ingredients.map((ing, idx) => ({
            recipe_id: newRecipe.id,
            name: ing.name,
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            order_index: idx,
          }));
          await supabase.from('recipe_ingredients').insert(ingredientRows);
        }

        if (recipe.steps && recipe.steps.length > 0) {
          const stepRows = recipe.steps.map((step, idx) => ({
            recipe_id: newRecipe.id,
            step_number: idx + 1,
            instruction: step.instruction,
          }));
          await supabase.from('recipe_steps').insert(stepRows);
        }

        recipeData = { id: newRecipe.id, postId: post.id };
      } catch (recipeErr) {
        console.error('Error creating recipe with post:', recipeErr);
      }
    }

    const result = mapPost(post);
    if (recipeData) result.recipeId = recipeData.id;
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id - update post (owner only, auth required)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to edit this post.' });
    }

    const updates = {};
    if (req.body.caption !== undefined) {
      if (typeof req.body.caption !== 'string') {
        return res.status(400).json({ error: 'Caption must be a string.' });
      }
      updates.caption = req.body.caption.slice(0, 500);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: now, edited_at: now })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapPost(updated));
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id - delete post (owner or moderator+, auth required)
router.delete('/:id', requireAuth, requireMinRole('user'), async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    const isModerator = ['moderator', 'admin'].includes(req.userRole);
    if (post.user_id !== req.userId && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: postImages } = await supabase
      .from('post_images')
      .select('image_path')
      .eq('post_id', req.params.id);

    const mediaPaths = new Set();
    if (postImages) {
      for (const img of postImages) {
        if (img.image_path) mediaPaths.add(img.image_path);
      }
    }
    if (post.image_path) mediaPaths.add(post.image_path);

    for (const mediaPath of mediaPaths) {
      if (mediaPath.startsWith('http')) {
        await deleteFromSupabaseStorage(mediaPath);
      } else {
        const fullPath = path.join(__dirname, '..', '..', mediaPath);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch {}
        }
      }
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
