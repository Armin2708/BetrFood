-- =============================================
-- Iteration 1: All remaining tables
-- =============================================

-- 1. Reports table (content reporting system)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- 2. Collections table (named collections for bookmarking posts)
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

-- 3. Collection posts junction table
CREATE TABLE IF NOT EXISTS collection_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (collection_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_posts_collection ON collection_posts(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_posts_post ON collection_posts(post_id);

-- 4. User preferences table (dietary, allergies, cuisines, visibility)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  cuisines JSONB DEFAULT '[]'::jsonb,
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
  dietary_info_visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- 5. User blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 6. User mutes table
CREATE TABLE IF NOT EXISTS user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id TEXT NOT NULL,
  muted_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (muter_id, muted_id)
);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON user_mutes(muted_id);

-- 7. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- 8. Add verified column to user_profiles (for creator verification badge)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
