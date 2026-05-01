-- Add searchable to user_preferences
-- When false, the user's profile is excluded from search results.
-- Defaults to true so all existing and new accounts are visible in search.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS searchable BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_preferences_searchable
  ON user_preferences(searchable);
