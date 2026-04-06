CREATE TABLE IF NOT EXISTS follow_requests (
  requester_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  requested_user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (requester_id, requested_user_id)
);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requested ON follow_requests(requested_user_id);
