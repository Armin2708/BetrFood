ALTER TABLE user_preference_vectors
  ADD COLUMN IF NOT EXISTS cold_start_weight NUMERIC(3,2) DEFAULT 1.0;

ALTER TABLE user_preference_vectors
  ADD COLUMN IF NOT EXISTS behavioral_weight NUMERIC(3,2) DEFAULT 0.0;
