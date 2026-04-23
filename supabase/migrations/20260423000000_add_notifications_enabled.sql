-- Add notifications_enabled column to user_preferences
-- Global in-app notification toggle. When false, the notification dispatch
-- path short-circuits and no new notification records are created for the
-- user. See GitHub issue #113.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;
