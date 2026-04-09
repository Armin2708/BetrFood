const supabase = require('../db/supabase');
const { getUserRecentInteractions, getUserEngagementMetrics, getNegativeFeedbackPostIds } = require('../db/interactions');

/**
 * Calculate a relevance score for a post based on user preferences and engagement
 * Score is normalized 0-1
 *
 * @param {Object} post - Post object with tags, likeCount, createdAt
 * @param {Object} userPrefVector - User's preference vector from DB
 * @param {Object} options - Calculate options
 * @returns {number} Score between 0-1
 */
function calculatePostRelevanceScore(post, userPrefVector, options = {}) {
  const {
    tagWeight = 0.40,
    engagementWeight = 0.20,
    recencyWeight = 0.20,
    historyWeight = 0.15,
    negativeFeedbackPenalty = 0.05,
  } = options;

  let score = 0;

  // 1. Tag matching (40% weight by default)
  // Match post tags to user's cuisine, meal type, and dietary preferences
  if (post.tags && post.tags.length > 0 && Object.keys(userPrefVector.cuisine_scores || {}).length > 0) {
    const tagScore = calculateTagRelevance(post.tags, userPrefVector);
    score += tagScore * tagWeight;
  } else {
    // If no preferences set, neutral score
    score += 0.5 * tagWeight;
  }

  // 2. Engagement popularity (20% weight)
  // Popular posts are more likely to be relevant
  const popularityScore = Math.min((post.likeCount || 0) / 100, 1.0);
  score += popularityScore * engagementWeight;

  // 3. Recency boost (20% weight)
  // Prefer newer content, but decay logarithmically
  if (post.createdAt) {
    const ageHours = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
    const recencyScore = 1 / (1 + ageHours / 24); // Decay over 24 hours
    score += recencyScore * recencyWeight;
  } else {
    score += 0.5 * recencyWeight;
  }

  // 4. User interaction history (15% weight)
  // Users with more interaction history get better personalization
  const interactionCount = userPrefVector.total_interaction_count || 0;
  const historicalScore = interactionCount >= 50 ? 0.9 : (interactionCount / 50);
  score += historicalScore * historyWeight;

  // 5. Negative feedback penalty
  // Posts marked "not interested" get a penalty
  if (post.hasNegativeFeedback) {
    score -= negativeFeedbackPenalty;
  }

  return Math.max(0, Math.min(1, score)); // Clamp to 0-1
}

/**
 * Calculate how relevant a post's tags are to user's preferences
 * @param {Array} postTags - Array of tag objects {id, name, type}
 * @param {Object} userPrefVector - User preference vector
 * @returns {number} Score 0-1
 */
function calculateTagRelevance(postTags, userPrefVector) {
  if (!postTags || postTags.length === 0) return 0.5; // Neutral if no tags

  const cuisineScores = userPrefVector.cuisine_scores || {};
  const mealTypeScores = userPrefVector.meal_type_scores || {};
  const dietaryScores = userPrefVector.dietary_scores || {};

  let totalMatch = 0;
  let tagCount = 0;

  for (const tag of postTags) {
    let tagScore = 0;

    switch (tag.type) {
      case 'cuisine':
        tagScore = cuisineScores[tag.name] || 0;
        break;
      case 'meal':
        tagScore = mealTypeScores[tag.name] || 0;
        break;
      case 'dietary':
        tagScore = dietaryScores[tag.name] || 0;
        break;
      default:
        tagScore = 0.5; // Neutral for unknown types
    }

    totalMatch += tagScore;
    tagCount++;
  }

  return tagCount > 0 ? totalMatch / tagCount : 0.5;
}

/**
 * Calculate user preference vector based on their recent interactions
 * This is called by the scheduled job
 *
 * @param {string} userId - User ID
 * @param {Object} userPrefs - User's explicit preferences from user_preferences table
 * @returns {Object} Preference vector to store in user_preference_vectors
 */
async function calculateUserPreferenceVector(userId, userPrefs = {}) {
  try {
    // Get user's recent interactions
    const interactions = await getUserRecentInteractions(userId, 30); // Last 30 days
    const metrics = await getUserEngagementMetrics(userId);

    // Aggregate tag preferences from interactions
    const cuisineScores = {};
    const mealTypeScores = {};
    const dietaryScores = {};

    // Helper to update tag scores
    const updateTagScores = (interactions, weights) => {
      for (const interaction of interactions) {
        const tags = interaction.posts?.post_tags || [];
        for (const { tags: tagObj } of tags) {
          const weight = weights[interaction.feedback_type] || 1;
          if (tagObj.type === 'cuisine') {
            cuisineScores[tagObj.name] = (cuisineScores[tagObj.name] || 0) + weight;
          } else if (tagObj.type === 'meal') {
            mealTypeScores[tagObj.name] = (mealTypeScores[tagObj.name] || 0) + weight;
          } else if (tagObj.type === 'dietary') {
            dietaryScores[tagObj.name] = (dietaryScores[tagObj.name] || 0) + weight;
          }
        }
      }
    };

    // Interaction weights (likes are worth more than passive views)
    updateTagScores(interactions.likes, { like: 3 }); // Likes weighted higher
    updateTagScores(interactions.saves, { save: 2 }); // Saves are strong signals
    updateTagScores(interactions.comments, { comment: 1.5 }); // Comments show engagement

    // Normalize scores to 0-1 range
    const normalizeScores = (scores) => {
      const max = Math.max(...Object.values(scores), 1);
      const normalized = {};
      for (const [key, val] of Object.entries(scores)) {
        normalized[key] = val / max;
      }
      return normalized;
    };

    const normalizedCuisines = normalizeScores(cuisineScores);
    const normalizedMeals = normalizeScores(mealTypeScores);
    const normalizedDietary = normalizeScores(dietaryScores);

    // Calculate engagement score (0-1)
    // Based on interaction frequency and view duration
    const avgEngagementScore = Math.min(
      (metrics.recentInteractionCount / 20) * 0.5 + // Recent activity
      Math.min(metrics.avgViewDuration / 30, 1) * 0.5, // View duration
      1.0
    ) || 0.5;

    // Infer difficulty preference from past interactions
    const getPreferredDifficulty = () => {
      // If user frequently interacts with "easy" recipes, prefer beginner
      // If "advanced" recipes, prefer advanced
      // Default to beginner
      return userPrefs.cooking_skill || 'beginner';
    };

    const vector = {
      cuisine_scores: normalizedCuisines,
      meal_type_scores: normalizedMeals,
      dietary_scores: normalizedDietary,
      avg_engagement_score: avgEngagementScore,
      recent_interaction_count: metrics.recentInteractionCount,
      total_interaction_count: metrics.totalInteractionCount,
      preferred_cook_time_range: userPrefs.max_cook_time
        ? { min: 5, max: userPrefs.max_cook_time }
        : { min: 5, max: 60 },
      difficulty_preference: getPreferredDifficulty(),
      calculated_at: new Date().toISOString(),
      vector_version: 1,
    };

    return vector;
  } catch (error) {
    console.error(`Error calculating preference vector for user ${userId}:`, error);
    // Return neutral vector on error
    return {
      cuisine_scores: {},
      meal_type_scores: {},
      dietary_scores: {},
      avg_engagement_score: 0.5,
      recent_interaction_count: 0,
      total_interaction_count: 0,
      preferred_cook_time_range: { min: 5, max: 60 },
      difficulty_preference: 'beginner',
      calculated_at: new Date().toISOString(),
      vector_version: 1,
    };
  }
}

/**
 * Update or create preference vector for a user
 * @param {string} userId - User ID
 * @param {Object} vector - Preference vector
 */
async function saveUserPreferenceVector(userId, vector) {
  const { data, error } = await supabase
    .from('user_preference_vectors')
    .upsert({
      user_id: userId,
      ...vector,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return data;
}

/**
 * Get a user's preference vector, with cold-start fallback
 * @param {string} userId - User ID
 * @param {Object} userPreferences - User's explicit preferences (used for cold start)
 */
async function getUserPreferenceVector(userId, userPreferences = {}) {
  const { data, error } = await supabase
    .from('user_preference_vectors')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    throw error;
  }

  if (data) {
    return data;
  }

  // Cold start: create neutral preference vector
  const coldStartVector = await calculateUserPreferenceVector(userId, userPreferences);
  await saveUserPreferenceVector(userId, coldStartVector);
  return coldStartVector;
}

module.exports = {
  calculatePostRelevanceScore,
  calculateTagRelevance,
  calculateUserPreferenceVector,
  saveUserPreferenceVector,
  getUserPreferenceVector,
};
