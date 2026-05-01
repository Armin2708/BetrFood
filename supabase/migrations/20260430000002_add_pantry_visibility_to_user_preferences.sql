-- Add pantry_visibility to user_preferences
-- Values: 'only_me' | 'followers' | 'everyone'
-- Defaults to 'only_me' so all existing users start with private pantry

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS pantry_visibility TEXT NOT NULL DEFAULT 'only_me'
    CHECK (pantry_visibility IN ('only_me', 'followers', 'everyone'));
