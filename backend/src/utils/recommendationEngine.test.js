const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const {
  COLD_START_TRANSITION_INTERACTIONS,
  mapOnboardingPreferencesToVector,
  buildFallbackPreferenceVector,
  blendPreferenceVectors,
  calculatePostRelevanceScore,
} = require('./recommendationEngine');

test('maps onboarding cuisine and dietary selections into cold-start preference scores', () => {
  const vector = mapOnboardingPreferencesToVector({
    cuisines: ['Italian', 'Mexican'],
    profile_dietary_preferences: [17, 19],
  });

  assert.equal(vector.cuisine_scores.Italian, 1);
  assert.equal(vector.cuisine_scores.Mexican, 1);
  assert.equal(vector.dietary_scores.Vegan, 1);
  assert.equal(vector.dietary_scores['Gluten-Free'], 1);
});

test('fallback vector provides broad popular categories when onboarding data is missing', () => {
  const vector = buildFallbackPreferenceVector();

  assert.ok(Object.keys(vector.cuisine_scores).length > 0);
  assert.ok(Object.keys(vector.meal_type_scores).length > 0);
  assert.deepEqual(vector.dietary_scores, {});
});

test('cold-start blend transitions from onboarding to behavior after enough interactions', () => {
  const explicit = {
    cuisine_scores: { Italian: 1 },
    meal_type_scores: {},
    dietary_scores: { Vegetarian: 1 },
  };
  const behavioral = {
    cuisine_scores: { Thai: 1 },
    meal_type_scores: {},
    dietary_scores: { Vegan: 1 },
  };

  const newUser = blendPreferenceVectors(explicit, behavioral, 0);
  assert.equal(newUser.cuisine_scores.Italian, 1);
  assert.equal(newUser.cuisine_scores.Thai, 0);
  assert.equal(newUser.cold_start_weight, 1);

  const establishedUser = blendPreferenceVectors(explicit, behavioral, COLD_START_TRANSITION_INTERACTIONS);
  assert.equal(establishedUser.cuisine_scores.Italian, 0);
  assert.equal(establishedUser.cuisine_scores.Thai, 1);
  assert.equal(establishedUser.behavioral_weight, 1);
});

test('preference-matched posts score above unrelated posts for cold-start users', () => {
  const userVector = {
    cuisine_scores: { Italian: 1 },
    meal_type_scores: {},
    dietary_scores: { Vegetarian: 1 },
    total_interaction_count: 0,
  };

  const matchedPost = {
    tags: [
      { name: 'Italian', type: 'cuisine' },
      { name: 'Vegetarian', type: 'dietary' },
    ],
    likeCount: 5,
    createdAt: new Date().toISOString(),
  };
  const unrelatedPost = {
    tags: [
      { name: 'Thai', type: 'cuisine' },
      { name: 'Keto', type: 'dietary' },
    ],
    likeCount: 5,
    createdAt: new Date().toISOString(),
  };

  assert.ok(
    calculatePostRelevanceScore(matchedPost, userVector)
      > calculatePostRelevanceScore(unrelatedPost, userVector)
  );
});
