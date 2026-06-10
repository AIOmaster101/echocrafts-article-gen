-- crafts-seed.sql
-- Inserts the initial ceramics catalog into craft_items:
--   - 1 pillar: Japanese Pottery (complete guide)
--   - 5 spokes: Arita-yaki, Kutani-yaki, Bizen-yaki, Mino-yaki, Hagi-yaki
--
-- How to run (Supabase CLI):
--   supabase db execute --file supabase/crafts-seed.sql
-- Or paste directly into the Supabase SQL Editor.
-- The file is idempotent: re-running it is safe due to ON CONFLICT DO NOTHING.

-- Insert pillar first
INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, meti_designated, region_ja, region_en, priority, status)
VALUES (
  'japanese-pottery-complete-guide',
  'Japanese Pottery: A Complete Guide',
  '日本の陶磁器 完全ガイド',
  'ceramics',
  'pillar',
  false,
  '日本全国',
  'Japan',
  10,
  'pending_facts'
)
ON CONFLICT (slug) DO NOTHING;

-- Insert spokes with pillar_id reference
INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'arita-yaki',
    'Arita-yaki',
    '有田焼',
    'ceramics',
    'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-pottery-complete-guide'),
    true,
    1977,
    '佐賀県有田町',
    'Arita, Saga Prefecture',
    20,
    'pending_facts'
  ),
  (
    'kutani-yaki',
    'Kutani-yaki',
    '九谷焼',
    'ceramics',
    'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-pottery-complete-guide'),
    true,
    1975,
    '石川県能美市',
    'Nomi, Ishikawa Prefecture',
    30,
    'pending_facts'
  ),
  (
    'bizen-yaki',
    'Bizen-yaki',
    '備前焼',
    'ceramics',
    'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-pottery-complete-guide'),
    true,
    1982,
    '岡山県備前市',
    'Bizen, Okayama Prefecture',
    40,
    'pending_facts'
  ),
  (
    'mino-yaki',
    'Mino-yaki',
    '美濃焼',
    'ceramics',
    'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-pottery-complete-guide'),
    true,
    1978,
    '岐阜県土岐市',
    'Toki, Gifu Prefecture',
    50,
    'pending_facts'
  ),
  (
    'hagi-yaki',
    'Hagi-yaki',
    '萩焼',
    'ceramics',
    'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-pottery-complete-guide'),
    true,
    2002,
    '山口県萩市',
    'Hagi, Yamaguchi Prefecture',
    60,
    'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;
