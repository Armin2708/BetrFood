-- data_export_requests: tracks user data export requests
-- status: 'pending' | 'processing' | 'ready' | 'failed'
-- download_url: signed Supabase Storage URL (populated when ready)
-- expires_at: when the download link expires (24 hours after generation)

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  download_url TEXT,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id
  ON data_export_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_status
  ON data_export_requests(status);
