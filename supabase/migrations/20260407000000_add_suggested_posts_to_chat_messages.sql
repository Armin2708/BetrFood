-- Add suggested_posts JSONB column to chat_messages for persisting AI post suggestions
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS suggested_posts JSONB DEFAULT '[]'::jsonb;
