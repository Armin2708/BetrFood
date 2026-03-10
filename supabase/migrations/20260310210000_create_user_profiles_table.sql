CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY, -- Clerk user ID
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  dietary_preferences INTEGER[] DEFAULT '{}', -- tag IDs from tags table where type='dietary'
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
