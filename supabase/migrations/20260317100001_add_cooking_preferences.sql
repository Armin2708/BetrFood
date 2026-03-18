-- Add cooking preferences fields to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS cooking_skill TEXT DEFAULT 'beginner'
    CHECK (cooking_skill IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS max_cook_time INTEGER;
