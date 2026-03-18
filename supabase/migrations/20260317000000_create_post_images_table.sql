CREATE TABLE IF NOT EXISTS post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);

-- Migrate existing single-image posts into post_images
INSERT INTO post_images (post_id, image_path, order_index)
SELECT id, image_path, 0 FROM posts
WHERE image_path IS NOT NULL
ON CONFLICT DO NOTHING;
