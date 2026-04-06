-- Add FK constraints to user_blocks and user_mutes tables
-- These tables were created without foreign key references to user_profiles

-- user_blocks: add FK on blocker_id and blocked_id
ALTER TABLE user_blocks
  ADD CONSTRAINT fk_user_blocks_blocker
    FOREIGN KEY (blocker_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE user_blocks
  ADD CONSTRAINT fk_user_blocks_blocked
    FOREIGN KEY (blocked_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- user_mutes: add FK on muter_id and muted_id
ALTER TABLE user_mutes
  ADD CONSTRAINT fk_user_mutes_muter
    FOREIGN KEY (muter_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE user_mutes
  ADD CONSTRAINT fk_user_mutes_muted
    FOREIGN KEY (muted_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
