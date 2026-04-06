-- Add expiration_notifications_enabled column to user_preferences
-- This column was referenced in backend code but never migrated
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS expiration_notifications_enabled BOOLEAN DEFAULT false;
