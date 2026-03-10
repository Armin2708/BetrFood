-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This creates all the tables needed for BetrFood

-- ─── Posts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  caption TEXT DEFAULT '',
  image_path TEXT,
  image_paths TEXT[] DEFAULT '{}',
  video_path TEXT,
  video_type TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON posts(is_draft);

-- Add new columns to existing posts table if not already present
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_path TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_type TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE posts ALTER COLUMN image_path DROP NOT NULL;

-- ─── Tags ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('cuisine', 'meal', 'dietary'))
);

-- ─── Post-tags junction ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);

-- ─── User follows ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- ─── User profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Recipes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  cook_time INTEGER,
  servings INTEGER,
  difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_post_id ON recipes(post_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(step_number);

-- ─── Reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ─── Role audit log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  previous_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON role_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_target_user_id ON role_audit_log(target_user_id);

-- ─── Seed tags ────────────────────────────────────────────────────────────────
INSERT INTO tags (name, type) VALUES
  ('Italian', 'cuisine'), ('Japanese', 'cuisine'), ('Mexican', 'cuisine'),
  ('Indian', 'cuisine'), ('Thai', 'cuisine'), ('Chinese', 'cuisine'),
  ('French', 'cuisine'), ('American', 'cuisine'), ('Mediterranean', 'cuisine'),
  ('Korean', 'cuisine'), ('Breakfast', 'meal'), ('Lunch', 'meal'),
  ('Dinner', 'meal'), ('Snack', 'meal'), ('Dessert', 'meal'),
  ('Brunch', 'meal'), ('Vegan', 'dietary'), ('Vegetarian', 'dietary'),
  ('Gluten-Free', 'dietary'), ('Keto', 'dietary'), ('Paleo', 'dietary'),
  ('Dairy-Free', 'dietary'), ('Nut-Free', 'dietary'), ('Low-Carb', 'dietary')
ON CONFLICT (name) DO NOTHING;
