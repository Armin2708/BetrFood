-- Migrate allergies column from TEXT[] to JSONB to support severity levels.
-- New format: [{"name": "Peanuts", "severity": "severe"}, ...]
-- Severity values: "mild", "moderate", "severe"

ALTER TABLE user_preferences
  ALTER COLUMN allergies SET DATA TYPE JSONB
  USING COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('name', elem, 'severity', 'moderate'))
     FROM unnest(allergies) AS elem),
    '[]'::jsonb
  );

ALTER TABLE user_preferences
  ALTER COLUMN allergies SET DEFAULT '[]'::jsonb;
