-- search_queries: tracks every executed search for trending/popular suggestions
-- query_text  : normalized lowercase search term
-- hit_count   : incremented each time the query is executed
-- last_searched_at : updated on every hit (used for recency ranking)

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (query_text)
);

CREATE INDEX IF NOT EXISTS idx_search_queries_text ON search_queries(query_text text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_search_queries_hits ON search_queries(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_recent ON search_queries(last_searched_at DESC);
