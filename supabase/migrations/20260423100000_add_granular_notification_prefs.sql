-- Add granular per-type notification preference columns to user_preferences.
-- Extends the global notifications_enabled toggle from issue #113 so users can
-- mute individual notification categories independently. See GitHub issue #114.
--
-- Note: pantry-expiration notifications continue to use the existing
-- expiration_notifications_enabled column and are NOT duplicated here.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notif_new_follower BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_likes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_comment_replies BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_ai_chat BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_digest BOOLEAN NOT NULL DEFAULT true;
