-- Migrate allergies column from TEXT[] to JSONB to support severity levels.
-- New format: [{"name": "Peanuts", "severity": "severe"}, ...]
-- Severity values: "mild", "moderate", "severe"

-- Step 1: Add a new JSONB column
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS allergies_new JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing TEXT[] data to JSONB format
UPDATE user_preferences
SET allergies_new = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('name', elem, 'severity', 'moderate'))
   FROM unnest(allergies::text[]) AS elem),
  '[]'::jsonb
)
WHERE allergies IS NOT NULL AND array_length(allergies::text[], 1) > 0;

-- Step 3: Drop old column and rename new one
ALTER TABLE user_preferences DROP COLUMN allergies;
ALTER TABLE user_preferences RENAME COLUMN allergies_new TO allergies;
