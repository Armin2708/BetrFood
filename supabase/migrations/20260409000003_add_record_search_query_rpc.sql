-- RPC function used by POST /api/posts/autocomplete/record
-- Upserts a search query: inserts if new, increments hit_count + updates timestamp if exists

CREATE OR REPLACE FUNCTION record_search_query(p_query TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO search_queries (query_text, hit_count, last_searched_at)
  VALUES (p_query, 1, now())
  ON CONFLICT (query_text)
  DO UPDATE SET
    hit_count = search_queries.hit_count + 1,
    last_searched_at = now();
END;
$$;
