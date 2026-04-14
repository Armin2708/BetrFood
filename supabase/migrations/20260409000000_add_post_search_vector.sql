-- Add full-text search vector to posts
-- Combines: caption (weight A) + tag names (weight B) + ingredient names (weight C)

ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);

-- Function to rebuild a single post's search_vector
-- Called by trigger on insert/update, and run once below for existing rows
CREATE OR REPLACE FUNCTION update_post_search_vector(p_post_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_caption    TEXT;
  v_tag_names  TEXT;
  v_ingredients TEXT;
BEGIN
  -- Get caption
  SELECT COALESCE(caption, '') INTO v_caption
  FROM posts WHERE id = p_post_id;

  -- Aggregate tag names for this post
  SELECT COALESCE(string_agg(t.name, ' '), '')
  INTO v_tag_names
  FROM post_tags pt
  JOIN tags t ON t.id = pt.tag_id
  WHERE pt.post_id = p_post_id;

  -- Aggregate ingredient names for this post (via recipes)
  SELECT COALESCE(string_agg(ri.name, ' '), '')
  INTO v_ingredients
  FROM recipes r
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE r.post_id = p_post_id;

  -- Update the vector with weighted sections:
  --   A = caption (highest weight)
  --   B = tags
  --   C = ingredients
  UPDATE posts
  SET search_vector =
    setweight(to_tsvector('english', v_caption), 'A') ||
    setweight(to_tsvector('english', v_tag_names), 'B') ||
    setweight(to_tsvector('english', v_ingredients), 'C')
  WHERE id = p_post_id;
END;
$$;

-- Trigger function that fires on post insert/update
CREATE OR REPLACE FUNCTION trg_update_post_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM update_post_search_vector(NEW.id);
  RETURN NEW;
END;
$$;

-- Attach trigger to posts table
DROP TRIGGER IF EXISTS post_search_vector_update ON posts;
CREATE TRIGGER post_search_vector_update
  AFTER INSERT OR UPDATE OF caption ON posts
  FOR EACH ROW EXECUTE FUNCTION trg_update_post_search_vector();

-- Backfill all existing posts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM posts LOOP
    PERFORM update_post_search_vector(r.id);
  END LOOP;
END;
$$;
