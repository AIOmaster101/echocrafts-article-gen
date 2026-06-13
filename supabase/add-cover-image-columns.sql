-- Add cover image columns to craft_items
ALTER TABLE craft_items
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_credit TEXT;
