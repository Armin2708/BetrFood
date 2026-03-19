/**
 * Run this script once to create the Supabase tables.
 * Usage: node src/db/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..env') });
const supabase = require('./supabase');

async function migrate() {
  console.log('Running migrations on Supabase...');

  // Create tables via Supabase SQL (uses the service_role key)
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      -- Posts table
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        caption TEXT DEFAULT '',
        image_path TEXT NOT NULL,
        media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        edited_at TIMESTAMPTZ
      );
      -- Add media_type column if table already exists
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
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
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
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
    `
  });

  if (error) {
    // The rpc function might not exist; fall back to individual table creation
    console.log('RPC not available, creating tables individually...');
    await createTablesIndividually();
  } else {
    console.log('Tables created via RPC.');
  }

  // Seed tags
  await seedTags();
  console.log('Migration complete!');
}

async function createTablesIndividually() {
  // Check if posts table exists by trying to select from it
  const { error: postsError } = await supabase.from('posts').select('id').limit(1);
  if (postsError && postsError.code === '42P01') {
    console.log('Tables do not exist. Please create them in the Supabase SQL Editor:');
    console.log(`
-- Run this SQL in your Supabase Dashboard > SQL Editor:

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

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('cuisine', 'meal', 'dietary'))
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
    `);
  } else {
    console.log('Posts table already exists or accessible.');
  }
}

async function seedTags() {
  const { data: existing } = await supabase.from('tags').select('id').limit(1);

  if (existing && existing.length > 0) {
    console.log('Tags already seeded, skipping.');
    return;
  }

  const tags = [
    { name: 'Italian', type: 'cuisine' },
    { name: 'Japanese', type: 'cuisine' },
    { name: 'Mexican', type: 'cuisine' },
    { name: 'Indian', type: 'cuisine' },
    { name: 'Thai', type: 'cuisine' },
    { name: 'Chinese', type: 'cuisine' },
    { name: 'French', type: 'cuisine' },
    { name: 'American', type: 'cuisine' },
    { name: 'Mediterranean', type: 'cuisine' },
    { name: 'Korean', type: 'cuisine' },
    { name: 'Breakfast', type: 'meal' },
    { name: 'Lunch', type: 'meal' },
    { name: 'Dinner', type: 'meal' },
    { name: 'Snack', type: 'meal' },
    { name: 'Dessert', type: 'meal' },
    { name: 'Brunch', type: 'meal' },
    { name: 'Vegan', type: 'dietary' },
    { name: 'Vegetarian', type: 'dietary' },
    { name: 'Gluten-Free', type: 'dietary' },
    { name: 'Keto', type: 'dietary' },
    { name: 'Paleo', type: 'dietary' },
    { name: 'Dairy-Free', type: 'dietary' },
    { name: 'Nut-Free', type: 'dietary' },
    { name: 'Low-Carb', type: 'dietary' },
  ];

  const { error } = await supabase.from('tags').insert(tags);
  if (error) {
    console.error('Error seeding tags:', error.message);
  } else {
    console.log('Seeded 24 tags.');
  }
}

migrate().catch(console.error);
