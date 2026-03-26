-- Create conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);

-- Add conversation_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
