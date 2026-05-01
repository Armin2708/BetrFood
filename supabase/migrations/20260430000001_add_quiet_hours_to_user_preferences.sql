-- Add quiet hours fields to user_preferences
-- quiet_hours_enabled   : whether quiet hours are active
-- quiet_hours_start     : start time as "HH:MM" string in user's local time (e.g. "22:00")
-- quiet_hours_end       : end time as "HH:MM" string in user's local time (e.g. "07:00")
-- quiet_hours_timezone  : IANA timezone string (e.g. "America/Los_Angeles")

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT NOT NULL DEFAULT 'UTC';
