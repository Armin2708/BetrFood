-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This creates all the tables needed for BetrFood

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  caption TEXT DEFAULT '',
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('cuisine', 'meal', 'dietary'))
);

-- Post-tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Seed tags
INSERT INTO tags (name, type) VALUES
  ('Italian', 'cuisine'),
  ('Japanese', 'cuisine'),
  ('Mexican', 'cuisine'),
  ('Indian', 'cuisine'),
  ('Thai', 'cuisine'),
  ('Chinese', 'cuisine'),
  ('French', 'cuisine'),
  ('American', 'cuisine'),
  ('Mediterranean', 'cuisine'),
  ('Korean', 'cuisine'),
  ('Breakfast', 'meal'),
  ('Lunch', 'meal'),
  ('Dinner', 'meal'),
  ('Snack', 'meal'),
  ('Dessert', 'meal'),
  ('Brunch', 'meal'),
  ('Vegan', 'dietary'),
  ('Vegetarian', 'dietary'),
  ('Gluten-Free', 'dietary'),
  ('Keto', 'dietary'),
  ('Paleo', 'dietary'),
  ('Dairy-Free', 'dietary'),
  ('Nut-Free', 'dietary'),
  ('Low-Carb', 'dietary')
ON CONFLICT (name) DO NOTHING;
