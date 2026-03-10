-- Add role column to user_profiles (the table is created by a separate migration)
-- This migration runs after 20260310210000_create_user_profiles_table.sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'creator', 'moderator', 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
