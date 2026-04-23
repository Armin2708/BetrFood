-- Creates the recommendation-engine tables referenced by the existing
-- 20260420000000_add_cold_start_recommendation_weights.sql migration and by
-- backend/src/db/schema.sql. These CREATE statements were previously only in
-- schema.sql but never captured as migrations, causing the migration chain
-- to fail when applied from scratch.

CREATE TABLE IF NOT EXISTS post_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  view_start_at TIMESTAMPTZ NOT NULL,
  view_end_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_impressions_post_id ON post_impressions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_impressions_user_id ON post_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_impressions_created_at ON post_impressions(created_at DESC);

CREATE TABLE IF NOT EXISTS post_negative_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'not_interested' CHECK (feedback_type IN ('not_interested', 'not_relevant')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_negative_feedback_post_id ON post_negative_feedback(post_id);
CREATE INDEX IF NOT EXISTS idx_post_negative_feedback_user_id ON post_negative_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_post_negative_feedback_created_at ON post_negative_feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS user_preference_vectors (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  cuisine_scores JSONB DEFAULT '{}'::jsonb,
  meal_type_scores JSONB DEFAULT '{}'::jsonb,
  dietary_scores JSONB DEFAULT '{}'::jsonb,
  avg_engagement_score NUMERIC(3,2) DEFAULT 0.5,
  recent_interaction_count INTEGER DEFAULT 0,
  total_interaction_count INTEGER DEFAULT 0,
  preferred_cook_time_range JSONB DEFAULT '{"min": 5, "max": 60}'::jsonb,
  difficulty_preference TEXT DEFAULT 'beginner' CHECK (difficulty_preference IN ('beginner', 'intermediate', 'advanced')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  calculated_at TIMESTAMPTZ,
  vector_version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_user_preference_vectors_updated ON user_preference_vectors(updated_at DESC);
