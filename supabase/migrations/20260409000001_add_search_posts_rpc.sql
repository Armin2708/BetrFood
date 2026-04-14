-- RPC function used by the search route: search_posts(query, limit, offset)
-- Returns posts ranked by ts_rank relevance score, newest first as tiebreaker.
CREATE OR REPLACE FUNCTION search_posts(
  search_query  TEXT,
  result_limit  INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS SETOF posts
LANGUAGE sql STABLE AS $$
  SELECT p.*
  FROM posts p
  WHERE p.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) DESC,
    p.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
$$;
