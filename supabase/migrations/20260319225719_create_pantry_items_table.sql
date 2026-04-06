-- Create pantry_items table for tracking user pantry inventory
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_name ON pantry_items(name);

-- Also add expiring_items_threshold to user_preferences if not present
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS expiring_items_threshold INTEGER DEFAULT 7;
