-- crafts-full-seed.sql
-- 経産省指定 伝統的工芸品 全品目シード（約240品目）
--
-- 内訳:
--   Pillar: 12件（カテゴリ別ガイド記事）
--   Spoke:  約235件（個別品目記事）
--   合計:   約247件
--
-- ※ crafts-seed.sql で登録済みの以下はON CONFLICT DO NOTHINGで重複回避:
--   japanese-pottery-complete-guide（pillar）
--   arita-yaki, kutani-yaki, bizen-yaki, mino-yaki, hagi-yaki（spoke）
--
-- 実行方法:
--   [Supabase SQL Editor] このファイルの内容をコピー＆ペーストして実行
--   [Supabase CLI]        supabase db execute --file supabase/crafts-full-seed.sql
--
-- 冪等性: ON CONFLICT (slug) DO NOTHING により再実行しても安全

-- =============================================================================
-- STEP 1: PILLAR ARTICLES（12カテゴリ）
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, meti_designated, region_ja, region_en, priority, status)
VALUES
  (
    'japanese-ceramics',
    'Japanese Ceramics: The Complete Guide',
    '日本の陶磁器 完全ガイド',
    'ceramics',
    'pillar',
    false,
    '日本全国',
    'Japan',
    10,
    'pending_facts'
  ),
  (
    'japanese-textiles',
    'Japanese Woven Textiles: The Complete Guide',
    '日本の織物 完全ガイド',
    'textiles',
    'pillar',
    false,
    '日本全国',
    'Japan',
    20,
    'pending_facts'
  ),
  (
    'japanese-dyeing',
    'Japanese Dyed Textiles: The Complete Guide',
    '日本の染色品 完全ガイド',
    'dyeing',
    'pillar',
    false,
    '日本全国',
    'Japan',
    30,
    'pending_facts'
  ),
  (
    'japanese-lacquerware',
    'Japanese Lacquerware: The Complete Guide',
    '日本の漆器 完全ガイド',
    'lacquerware',
    'pillar',
    false,
    '日本全国',
    'Japan',
    40,
    'pending_facts'
  ),
  (
    'japanese-woodwork',
    'Japanese Wood & Bamboo Crafts: The Complete Guide',
    '日本の木工品・竹工品 完全ガイド',
    'woodwork',
    'pillar',
    false,
    '日本全国',
    'Japan',
    50,
    'pending_facts'
  ),
  (
    'japanese-metalwork',
    'Japanese Metalwork: The Complete Guide',
    '日本の金工品 完全ガイド',
    'metalwork',
    'pillar',
    false,
    '日本全国',
    'Japan',
    60,
    'pending_facts'
  ),
  (
    'japanese-dolls',
    'Japanese Dolls & Kokeshi: The Complete Guide',
    '日本の人形・こけし 完全ガイド',
    'dolls',
    'pillar',
    false,
    '日本全国',
    'Japan',
    70,
    'pending_facts'
  ),
  (
    'japanese-washi',
    'Japanese Washi Paper: The Complete Guide',
    '日本の和紙 完全ガイド',
    'washi',
    'pillar',
    false,
    '日本全国',
    'Japan',
    80,
    'pending_facts'
  ),
  (
    'japanese-stationery',
    'Japanese Craft Stationery: The Complete Guide',
    '日本の文具 完全ガイド',
    'stationery',
    'pillar',
    false,
    '日本全国',
    'Japan',
    85,
    'pending_facts'
  ),
  (
    'japanese-stonework',
    'Japanese Stonework: The Complete Guide',
    '日本の石工品 完全ガイド',
    'stonework',
    'pillar',
    false,
    '日本全国',
    'Japan',
    87,
    'pending_facts'
  ),
  (
    'japanese-buddhist-crafts',
    'Japanese Buddhist Crafts: The Complete Guide',
    '日本の仏壇・仏具 完全ガイド',
    'buddhist',
    'pillar',
    false,
    '日本全国',
    'Japan',
    90,
    'pending_facts'
  ),
  (
    'japanese-other-crafts',
    'Japanese Traditional Crafts (Other): The Complete Guide',
    '日本の伝統工芸品（その他） 完全ガイド',
    'other',
    'pillar',
    false,
    '日本全国',
    'Japan',
    95,
    'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 2: SPOKE ARTICLES — 陶磁器 / Ceramics
-- =============================================================================
-- ※ arita-yaki, kutani-yaki, bizen-yaki, mino-yaki, hagi-yaki は
--   crafts-seed.sql 登録済み。ON CONFLICT DO NOTHING で安全にスキップ。

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  -- 既存5品目（重複回避のため再掲）
  (
    'arita-yaki',
    'Arita-yaki: Japanese Porcelain from Saga',
    '有田焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '佐賀県有田町', 'Arita, Saga Prefecture', 100, 'pending_facts'
  ),
  (
    'kutani-yaki',
    'Kutani-yaki: Colorful Porcelain from Ishikawa',
    '九谷焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1975, '石川県能美市', 'Nomi, Ishikawa Prefecture', 110, 'pending_facts'
  ),
  (
    'bizen-yaki',
    'Bizen-yaki: Unglazed Stoneware from Okayama',
    '備前焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1982, '岡山県備前市', 'Bizen, Okayama Prefecture', 120, 'pending_facts'
  ),
  (
    'mino-yaki',
    'Mino-yaki: Versatile Ceramics from Gifu',
    '美濃焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1978, '岐阜県土岐市', 'Toki, Gifu Prefecture', 130, 'pending_facts'
  ),
  (
    'hagi-yaki',
    'Hagi-yaki: Tea Ceremony Ware from Yamaguchi',
    '萩焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 2002, '山口県萩市', 'Hagi, Yamaguchi Prefecture', 140, 'pending_facts'
  ),
  -- 新規品目
  (
    'mashiko-yaki',
    'Mashiko-yaki: Folk Pottery from Tochigi',
    '益子焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1979, '栃木県益子町', 'Mashiko, Tochigi Prefecture', 150, 'pending_facts'
  ),
  (
    'kiyomizu-yaki',
    'Kyo-yaki / Kiyomizu-yaki: Kyoto Ceramics',
    '清水焼（京焼）',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '京都府京都市', 'Kyoto, Kyoto Prefecture', 160, 'pending_facts'
  ),
  (
    'shigaraki-yaki',
    'Shigaraki-yaki: Ancient Kiln Stoneware from Shiga',
    '信楽焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1975, '滋賀県甲賀市', 'Koka, Shiga Prefecture', 170, 'pending_facts'
  ),
  (
    'seto-yaki',
    'Seto-yaki: Ceramics from the Historic Kiln Town of Seto',
    '瀬戸焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '愛知県瀬戸市', 'Seto, Aichi Prefecture', 180, 'pending_facts'
  ),
  (
    'tokoname-yaki',
    'Tokoname-yaki: Teapot Ceramics from Aichi',
    '常滑焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1976, '愛知県常滑市', 'Tokoname, Aichi Prefecture', 190, 'pending_facts'
  ),
  (
    'tamba-tachikui-yaki',
    'Tamba-tachikui-yaki: Rustic Stoneware from Hyogo',
    '丹波立杭焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1978, '兵庫県丹波篠山市', 'Tanba Sasayama, Hyogo Prefecture', 200, 'pending_facts'
  ),
  (
    'karatsu-yaki',
    'Karatsu-yaki: Tea Ceremony Ceramics from Saga',
    '唐津焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 2016, '佐賀県唐津市', 'Karatsu, Saga Prefecture', 210, 'pending_facts'
  ),
  (
    'izushi-yaki',
    'Izushi-yaki: White Porcelain from Hyogo',
    '出石焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1979, '兵庫県豊岡市出石町', 'Izushi, Toyooka, Hyogo Prefecture', 220, 'pending_facts'
  ),
  (
    'tsuboya-yaki',
    'Tsuboya-yaki: Traditional Okinawan Pottery',
    '壺屋焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1976, '沖縄県那覇市', 'Naha, Okinawa Prefecture', 230, 'pending_facts'
  ),
  (
    'tobe-yaki',
    'Tobe-yaki: White Porcelain from Ehime',
    '砥部焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1976, '愛媛県伊予郡砥部町', 'Tobe, Ehime Prefecture', 240, 'pending_facts'
  ),
  (
    'otani-yaki',
    'Otani-yaki: Large-Scale Pottery from Tokushima',
    '大谷焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1976, '徳島県鳴門市', 'Naruto, Tokushima Prefecture', 250, 'pending_facts'
  ),
  (
    'koishiwara-yaki',
    'Koishiwara-yaki: Folk Pottery from Fukuoka',
    '小石原焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1975, '福岡県朝倉郡東峰村', 'Toho Village, Fukuoka Prefecture', 260, 'pending_facts'
  ),
  (
    'takatori-yaki',
    'Takatori-yaki: Tea Ceremony Ware from Fukuoka',
    '高取焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1975, '福岡県朝倉郡東峰村', 'Toho Village, Fukuoka Prefecture', 270, 'pending_facts'
  ),
  (
    'agano-yaki',
    'Agano-yaki: Tea Ceremony Ceramics from Fukuoka',
    '上野焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1983, '福岡県田川郡福智町', 'Fukuchi, Fukuoka Prefecture', 280, 'pending_facts'
  ),
  (
    'amakusa-toujiki',
    'Amakusa Toujiki: Porcelain from Kumamoto',
    '天草陶磁器',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '熊本県天草市', 'Amakusa, Kumamoto Prefecture', 290, 'pending_facts'
  ),
  (
    'echizen-yaki',
    'Echizen-yaki: Ancient Kiln Pottery from Fukui',
    '越前焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1986, '福井県越前町', 'Echizen, Fukui Prefecture', 300, 'pending_facts'
  ),
  (
    'hasami-yaki',
    'Hasami-yaki: Everyday Porcelain from Nagasaki',
    '波佐見焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 2015, '長崎県東彼杵郡波佐見町', 'Hasami, Nagasaki Prefecture', 310, 'pending_facts'
  ),
  (
    'shoudai-yaki',
    'Shoudai-yaki: Folk Pottery from Kumamoto',
    '小代焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '熊本県荒尾市・玉名郡', 'Arao, Kumamoto Prefecture', 320, 'pending_facts'
  ),
  (
    'satsuma-yaki',
    'Satsuma-yaki: Historical Pottery from Kagoshima',
    '薩摩焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1975, '鹿児島県薩摩川内市', 'Satsumasendai, Kagoshima Prefecture', 330, 'pending_facts'
  ),
  (
    'akazu-yaki',
    'Akazu-yaki: Traditional Ceramics from Aichi',
    '赤津焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '愛知県瀬戸市', 'Seto, Aichi Prefecture', 340, 'pending_facts'
  ),
  (
    'banko-yaki',
    'Banko-yaki: Teapot Ceramics from Mie',
    '万古焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1979, '三重県四日市市', 'Yokkaichi, Mie Prefecture', 350, 'pending_facts'
  ),
  (
    'kasama-yaki',
    'Kasama-yaki: Contemporary Folk Pottery from Ibaraki',
    '笠間焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1992, '茨城県笠間市', 'Kasama, Ibaraki Prefecture', 360, 'pending_facts'
  ),
  (
    'iga-yaki',
    'Iga-yaki: Wabi-sabi Stoneware from Mie',
    '伊賀焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1982, '三重県伊賀市', 'Iga, Mie Prefecture', 370, 'pending_facts'
  ),
  (
    'fujina-yaki',
    'Fujina-yaki: Folk Pottery from Shimane',
    '布志名焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1977, '島根県松江市', 'Matsue, Shimane Prefecture', 380, 'pending_facts'
  ),
  (
    'mikawachi-yaki',
    'Mikawachi-yaki: Refined Porcelain from Nagasaki',
    '三川内焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1978, '長崎県佐世保市', 'Sasebo, Nagasaki Prefecture', 390, 'pending_facts'
  ),
  (
    'aizu-hongo-yaki',
    'Aizu Hongo-yaki: Pottery from Fukushima',
    '会津本郷焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, 1993, '福島県大沼郡会津美里町', 'Aizumisato, Fukushima Prefecture', 400, 'pending_facts'
  ),
  (
    'ryumonji-yaki',
    'Ryumonji-yaki: Black Glazed Pottery from Kagoshima',
    '龍門司焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, NULL, '鹿児島県姶良市', 'Aira, Kagoshima Prefecture', 410, 'pending_facts'
  ),
  (
    'naeshirogawa-yaki',
    'Naeshirogawa-yaki: Korean-style Pottery from Kagoshima',
    '苗代川焼',
    'ceramics', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-ceramics'),
    true, NULL, '鹿児島県日置市', 'Hioki, Kagoshima Prefecture', 420, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 3: SPOKE ARTICLES — 織物 / Textiles
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'nishijin-ori',
    'Nishijin-ori: Luxurious Woven Silk from Kyoto',
    '西陣織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '京都府京都市', 'Kyoto, Kyoto Prefecture', 100, 'pending_facts'
  ),
  (
    'hakata-ori',
    'Hakata-ori: Traditional Woven Silk from Fukuoka',
    '博多織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '福岡県福岡市', 'Fukuoka, Fukuoka Prefecture', 110, 'pending_facts'
  ),
  (
    'yuki-tsumugi',
    'Yuki-tsumugi: Silk Pongee from Ibaraki and Tochigi',
    '結城紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '茨城県結城市・栃木県小山市', 'Yuki, Ibaraki / Oyama, Tochigi', 120, 'pending_facts'
  ),
  (
    'oshima-tsumugi',
    'Oshima-tsumugi: Silk Pongee from Kagoshima',
    '大島紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '鹿児島県奄美市', 'Amami, Kagoshima Prefecture', 130, 'pending_facts'
  ),
  (
    'yonezawa-ori',
    'Yonezawa-ori: Woven Silk from Yamagata',
    '米沢織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '山形県米沢市', 'Yonezawa, Yamagata Prefecture', 140, 'pending_facts'
  ),
  (
    'shiozawa-tsumugi',
    'Shiozawa-tsumugi: Fine Silk from Niigata',
    '塩沢紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '新潟県南魚沼市', 'Minamiuonuma, Niigata Prefecture', 150, 'pending_facts'
  ),
  (
    'ushikubi-tsumugi',
    'Ushikubi-tsumugi: Wild Silk from Ishikawa',
    '牛首紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '石川県白山市', 'Hakusan, Ishikawa Prefecture', 160, 'pending_facts'
  ),
  (
    'kihachijo',
    'Kihachijo: Yellow Striped Silk from Tokyo',
    '黄八丈',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '東京都八丈島', 'Hachijojima, Tokyo', 170, 'pending_facts'
  ),
  (
    'ojiya-chijimi',
    'Ojiya-chijimi: Ramie Crepe from Niigata',
    '小千谷縮',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '新潟県小千谷市', 'Ojiya, Niigata Prefecture', 180, 'pending_facts'
  ),
  (
    'echigo-jofu',
    'Echigo Jofu: High-Quality Ramie from Niigata',
    '越後上布',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '新潟県魚沼市', 'Uonuma, Niigata Prefecture', 190, 'pending_facts'
  ),
  (
    'miyako-jofu',
    'Miyako Jofu: Refined Ramie from Okinawa',
    '宮古上布',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '沖縄県宮古島市', 'Miyakojima, Okinawa Prefecture', 200, 'pending_facts'
  ),
  (
    'yaeyama-jofu',
    'Yaeyama Jofu: Fine Ramie from Okinawa',
    '八重山上布',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '沖縄県石垣市', 'Ishigaki, Okinawa Prefecture', 210, 'pending_facts'
  ),
  (
    'kurume-gasuri',
    'Kurume Kasuri: Indigo Ikat from Fukuoka',
    '久留米絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '福岡県久留米市', 'Kurume, Fukuoka Prefecture', 220, 'pending_facts'
  ),
  (
    'iyo-gasuri',
    'Iyo Kasuri: Cotton Ikat from Ehime',
    '伊予絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '愛媛県松山市', 'Matsuyama, Ehime Prefecture', 230, 'pending_facts'
  ),
  (
    'bingo-gasuri',
    'Bingo Kasuri: Cotton Ikat from Hiroshima',
    '備後絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1976, '広島県福山市', 'Fukuyama, Hiroshima Prefecture', 240, 'pending_facts'
  ),
  (
    'yumihama-gasuri',
    'Yumihama Kasuri: Cotton Ikat from Tottori',
    '弓浜絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '鳥取県米子市', 'Yonago, Tottori Prefecture', 250, 'pending_facts'
  ),
  (
    'ryukyu-gasuri',
    'Ryukyu Kasuri: Okinawan Traditional Ikat',
    '琉球絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '沖縄県南風原町', 'Haebaru, Okinawa Prefecture', 260, 'pending_facts'
  ),
  (
    'yomitanzan-hanaori',
    'Yomitanzan Hanaori: Flower-Woven Textile from Okinawa',
    '読谷山花織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 2002, '沖縄県読谷村', 'Yomitan, Okinawa Prefecture', 270, 'pending_facts'
  ),
  (
    'shuri-ori',
    'Shuri-ori: Royal Court Textiles from Okinawa',
    '首里織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1998, '沖縄県那覇市', 'Naha, Okinawa Prefecture', 280, 'pending_facts'
  ),
  (
    'yonaguni-ori',
    'Yonaguni-ori: Woven Textile from Japan''s Westernmost Island',
    '与那国織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '沖縄県与那国島', 'Yonaguni Island, Okinawa Prefecture', 290, 'pending_facts'
  ),
  (
    'chihana-hanaori',
    'Chihana Hanaori: Flower-Woven Textile from Okinawa',
    '知花花織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 2015, '沖縄県沖縄市', 'Okinawa City, Okinawa Prefecture', 300, 'pending_facts'
  ),
  (
    'honba-amami-oshima-tsumugi',
    'Honba Amami Oshima-tsumugi: Authentic Silk Pongee from Amami',
    '本場奄美大島紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1975, '鹿児島県奄美大島', 'Amami Oshima, Kagoshima Prefecture', 310, 'pending_facts'
  ),
  (
    'tama-ori',
    'Tama-ori: Traditional Silk Weaving from Tokyo',
    '多摩織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1984, '東京都八王子市', 'Hachioji, Tokyo', 320, 'pending_facts'
  ),
  (
    'kiryu-ori',
    'Kiryu-ori: Luxurious Woven Silk from Gunma',
    '桐生織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '群馬県桐生市', 'Kiryu, Gunma Prefecture', 330, 'pending_facts'
  ),
  (
    'ashikaga-ori',
    'Ashikaga-ori: Traditional Woven Textile from Tochigi',
    '足利織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '栃木県足利市', 'Ashikaga, Tochigi Prefecture', 340, 'pending_facts'
  ),
  (
    'chichibu-meisen',
    'Chichibu Meisen: Woven Silk from Saitama',
    '秩父織',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1993, '埼玉県秩父市', 'Chichibu, Saitama Prefecture', 350, 'pending_facts'
  ),
  (
    'tango-chirimen',
    'Tango Chirimen: Silk Crepe from Kyoto',
    '丹後ちりめん',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '京都府京丹後市', 'Kyotango, Kyoto Prefecture', 360, 'pending_facts'
  ),
  (
    'omi-jofu',
    'Omi Jofu: Fine Ramie from Shiga',
    '近江上布',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '滋賀県愛知郡愛荘町', 'Aishoto, Shiga Prefecture', 370, 'pending_facts'
  ),
  (
    'ise-momen',
    'Ise Momen: Traditional Cotton Textile from Mie',
    '伊勢木綿',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '三重県津市', 'Tsu, Mie Prefecture', 380, 'pending_facts'
  ),
  (
    'mikawa-momen',
    'Mikawa Momen: Cotton Textile from Aichi',
    '三河木綿',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '愛知県三河地方', 'Mikawa Region, Aichi Prefecture', 390, 'pending_facts'
  ),
  (
    'enshu-momen',
    'Enshu Momen: Cotton Textile from Shizuoka',
    '遠州木綿',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '静岡県浜松市', 'Hamamatsu, Shizuoka Prefecture', 400, 'pending_facts'
  ),
  (
    'gujo-tsumugi',
    'Gujo-tsumugi: Silk Pongee from Gifu',
    '郡上紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '岐阜県郡上市', 'Gujo, Gifu Prefecture', 410, 'pending_facts'
  ),
  (
    'hida-tsumugi',
    'Hida-tsumugi: Silk Pongee from Gifu',
    '飛騨紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '岐阜県高山市', 'Takayama, Gifu Prefecture', 420, 'pending_facts'
  ),
  (
    'noto-jofu',
    'Noto Jofu: Fine Ramie from Ishikawa',
    '能登上布',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, 1977, '石川県鹿島郡中能登町', 'Nakanoto, Ishikawa Prefecture', 430, 'pending_facts'
  ),
  (
    'tosa-tsumugi',
    'Tosa-tsumugi: Silk Pongee from Kochi',
    '土佐紬',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '高知県高知市', 'Kochi, Kochi Prefecture', 440, 'pending_facts'
  ),
  (
    'satsuma-gasuri',
    'Satsuma Kasuri: Cotton Ikat from Kagoshima',
    '薩摩絣',
    'textiles', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-textiles'),
    true, NULL, '鹿児島県薩摩地方', 'Satsuma Region, Kagoshima Prefecture', 450, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 4: SPOKE ARTICLES — 染色品 / Dyeing
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'kyo-yuzen',
    'Kyo-yuzen: Hand-painted Silk Dyeing from Kyoto',
    '京友禅',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1976, '京都府京都市', 'Kyoto, Kyoto Prefecture', 100, 'pending_facts'
  ),
  (
    'kaga-yuzen',
    'Kaga Yuzen: Realistic Floral Silk Dyeing from Kanazawa',
    '加賀友禅',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1975, '石川県金沢市', 'Kanazawa, Ishikawa Prefecture', 110, 'pending_facts'
  ),
  (
    'tokyo-some-komon',
    'Tokyo Some-komon: Fine-Pattern Dyeing from Tokyo',
    '東京染小紋',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1976, '東京都新宿区', 'Shinjuku, Tokyo', 120, 'pending_facts'
  ),
  (
    'nagoya-yuzen',
    'Nagoya Yuzen: Silk Dyeing from Aichi',
    '名古屋友禅',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, NULL, '愛知県名古屋市', 'Nagoya, Aichi Prefecture', 130, 'pending_facts'
  ),
  (
    'arimatsu-narumi-shibori',
    'Arimatsu-Narumi Shibori: Tie-Dyed Textile from Aichi',
    '有松・鳴海絞',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1975, '愛知県名古屋市有松・鳴海', 'Arimatsu-Narumi, Nagoya, Aichi Prefecture', 140, 'pending_facts'
  ),
  (
    'kyo-kanoko-shibori',
    'Kyo Kanoko Shibori: Kyoto Tie-Dye Textile',
    '京鹿の子絞',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1975, '京都府京都市', 'Kyoto, Kyoto Prefecture', 150, 'pending_facts'
  ),
  (
    'edo-komon',
    'Edo Komon: Fine-Pattern Dyed Textile from Tokyo',
    '江戸小紋',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1976, '東京都', 'Tokyo', 160, 'pending_facts'
  ),
  (
    'kyo-komon',
    'Kyo Komon: Fine-Pattern Dyed Silk from Kyoto',
    '京小紋',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 170, 'pending_facts'
  ),
  (
    'nagaita-chugata',
    'Nagaita Chugata: Indigo Stencil-Dyed Cotton from Tokyo',
    '長板中形',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1975, '東京都', 'Tokyo', 180, 'pending_facts'
  ),
  (
    'ryukyu-bingata',
    'Ryukyu Bingata: Colorful Stencil Dyeing from Okinawa',
    '琉球びんがた',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1984, '沖縄県那覧市', 'Naha, Okinawa Prefecture', 190, 'pending_facts'
  ),
  (
    'shinshu-tsumugi-dye',
    'Shinshu-tsumugi: Dyed Silk Pongee from Nagano',
    '信州紬',
    'dyeing', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dyeing'),
    true, 1975, '長野県上田市', 'Ueda, Nagano Prefecture', 200, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 5: SPOKE ARTICLES — 漆器 / Lacquerware
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'wajima-nuri',
    'Wajima-nuri: Renowned Lacquerware from Ishikawa',
    '輪島塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '石川県輪島市', 'Wajima, Ishikawa Prefecture', 100, 'pending_facts'
  ),
  (
    'aizu-nuri',
    'Aizu Lacquerware: Traditional Lacquer from Fukushima',
    '会津塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '福島県会津若松市', 'Aizuwakamatsu, Fukushima Prefecture', 110, 'pending_facts'
  ),
  (
    'yamanaka-nuri',
    'Yamanaka-nuri: Wood-Turned Lacquerware from Ishikawa',
    '山中塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '石川県加賀市', 'Kaga, Ishikawa Prefecture', 120, 'pending_facts'
  ),
  (
    'echizen-shikki',
    'Echizen Shikki: Lacquerware from Fukui',
    '越前漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '福井県鯖江市', 'Sabae, Fukui Prefecture', 130, 'pending_facts'
  ),
  (
    'kyo-shikki',
    'Kyo Shikki: Lacquerware from Kyoto',
    '京漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1977, '京都府京都市', 'Kyoto, Kyoto Prefecture', 140, 'pending_facts'
  ),
  (
    'kiso-shikki',
    'Kiso Shikki: Lacquerware from Nagano',
    '木曽漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '長野県塩尻市', 'Shiojiri, Nagano Prefecture', 150, 'pending_facts'
  ),
  (
    'takaoka-shikki',
    'Takaoka Shikki: Lacquerware from Toyama',
    '高岡漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '富山県高岡市', 'Takaoka, Toyama Prefecture', 160, 'pending_facts'
  ),
  (
    'tsugaru-nuri',
    'Tsugaru-nuri: Multi-Layer Lacquerware from Aomori',
    '津軽塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '青森県弘前市', 'Hirosaki, Aomori Prefecture', 170, 'pending_facts'
  ),
  (
    'kagawa-shikki',
    'Kagawa Shikki (Sanuki Lacquerware): Lacquerware from Kagawa',
    '香川漆器（讃岐漆器）',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1976, '香川県高松市', 'Takamatsu, Kagawa Prefecture', 180, 'pending_facts'
  ),
  (
    'kamakura-bori',
    'Kamakura-bori: Carved Lacquerware from Kanagawa',
    '鎌倉彫',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '神奈川県鎌倉市', 'Kamakura, Kanagawa Prefecture', 190, 'pending_facts'
  ),
  (
    'ouchi-nuri',
    'Ouchi-nuri: Lacquerware from Yamaguchi',
    '大内塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, NULL, '山口県山口市', 'Yamaguchi, Yamaguchi Prefecture', 200, 'pending_facts'
  ),
  (
    'hidehira-nuri',
    'Hidehira-nuri: Historic Lacquerware from Iwate',
    '秀衡塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1985, '岩手県西磐井郡平泉町', 'Hiraizumi, Iwate Prefecture', 210, 'pending_facts'
  ),
  (
    'ryukyu-shikki',
    'Ryukyu Shikki: Traditional Lacquerware from Okinawa',
    '琉球漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1984, '沖縄県那覇市', 'Naha, Okinawa Prefecture', 220, 'pending_facts'
  ),
  (
    'odawara-shikki',
    'Odawara Shikki: Lacquerware from Kanagawa',
    '小田原漆器',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1978, '神奈川県小田原市', 'Odawara, Kanagawa Prefecture', 230, 'pending_facts'
  ),
  (
    'shunkei-nuri',
    'Shunkei-nuri: Transparent Lacquerware from Gifu',
    '春慶塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, 1975, '岐阜県高山市', 'Takayama, Gifu Prefecture', 240, 'pending_facts'
  ),
  (
    'nakanosawa-shikki',
    'Nakanosawa Shikki: Lacquerware from Iwate',
    '浄法寺塗',
    'lacquerware', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-lacquerware'),
    true, NULL, '岩手県二戸市', 'Ninohe, Iwate Prefecture', 250, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 6: SPOKE ARTICLES — 木工品・竹工品 / Wood & Bamboo Crafts
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'kiso-mokkohin',
    'Kiso Mokkohin: Woodwork from Nagano',
    '木曽の木工品',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1975, '長野県木曽郡', 'Kiso District, Nagano Prefecture', 100, 'pending_facts'
  ),
  (
    'odate-magewappa',
    'Odate Magewappa: Bentwood Boxes from Akita',
    '大館曲げわっぱ',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1980, '秋田県大館市', 'Odate, Akita Prefecture', 110, 'pending_facts'
  ),
  (
    'hakone-yosegi-zaiku',
    'Hakone Yosegi Zaiku: Marquetry from Kanagawa',
    '箱根寄木細工',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1984, '神奈川県足柄下郡箱根町', 'Hakone, Kanagawa Prefecture', 120, 'pending_facts'
  ),
  (
    'edo-sashimono',
    'Edo Sashimono: Joinery Furniture from Tokyo',
    '江戸指物',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1976, '東京都', 'Tokyo', 130, 'pending_facts'
  ),
  (
    'suruga-sashimono',
    'Suruga Sashimono: Wooden Joinery from Shizuoka',
    '駿河指物',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1976, '静岡県静岡市', 'Shizuoka, Shizuoka Prefecture', 140, 'pending_facts'
  ),
  (
    'beppu-takezaiku',
    'Beppu Takezaiku: Bamboo Craft from Oita',
    '別府竹細工',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1979, '大分県別府市', 'Beppu, Oita Prefecture', 150, 'pending_facts'
  ),
  (
    'suruga-take-senjiku-zaiku',
    'Suruga Take Senjiku Zaiku: Fine Bamboo Work from Shizuoka',
    '駿河竹千筋細工',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1976, '静岡県静岡市', 'Shizuoka, Shizuoka Prefecture', 160, 'pending_facts'
  ),
  (
    'kamo-kiri-tansu',
    'Kamo Kiri Tansu: Paulownia Chest of Drawers from Niigata',
    '加茂桐箪笥',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1976, '新潟県加茂市', 'Kamo, Niigata Prefecture', 170, 'pending_facts'
  ),
  (
    'nishimeya-kokeshi',
    'Nishimeki-zaiku: Traditional Woodwork from Akita',
    '西馬音内の盆踊',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, NULL, '秋田県雄勝郡羽後町', 'Ugo, Akita Prefecture', 180, 'pending_facts'
  ),
  (
    'kyo-sashimono',
    'Kyo Sashimono: Traditional Joinery from Kyoto',
    '京指物',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1976, '京都府京都市', 'Kyoto, Kyoto Prefecture', 190, 'pending_facts'
  ),
  (
    'osaka-sashimono',
    'Osaka Sashimono: Furniture Joinery from Osaka',
    '大阪唐木指物',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1977, '大阪府大阪市', 'Osaka, Osaka Prefecture', 200, 'pending_facts'
  ),
  (
    'hida-shunkei',
    'Hida Shunkei: Transparent-Lacquered Woodwork from Gifu',
    '飛騨春慶',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1975, '岐阜県高山市', 'Takayama, Gifu Prefecture', 210, 'pending_facts'
  ),
  (
    'iwayado-tansu',
    'Iwayado Tansu: Chest of Drawers from Iwate',
    '岩谷堂箪笥',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, 1975, '岩手県奥州市', 'Oshu, Iwate Prefecture', 220, 'pending_facts'
  ),
  (
    'yamagata-imono-mokkohin',
    'Kamo Tansu: Traditional Wooden Furniture from Niigata',
    '加茂箪笥',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, NULL, '新潟県加茂市', 'Kamo, Niigata Prefecture', 230, 'pending_facts'
  ),
  (
    'nara-mokkohin',
    'Nara Mokkohin: Traditional Woodcraft from Nara',
    '奈良の木工品',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, NULL, '奈良県', 'Nara Prefecture', 240, 'pending_facts'
  ),
  (
    'kishu-tansu',
    'Kishu Tansu: Lacquered Chest from Wakayama',
    '紀州箪笥',
    'woodwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-woodwork'),
    true, NULL, '和歌山県海南市', 'Kainan, Wakayama Prefecture', 250, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 7: SPOKE ARTICLES — 金工品 / Metalwork
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'takaoka-douki',
    'Takaoka Douki: Cast Bronze Craft from Toyama',
    '高岡銅器',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1975, '富山県高岡市', 'Takaoka, Toyama Prefecture', 100, 'pending_facts'
  ),
  (
    'nanbu-tekki',
    'Nanbu Tekki: Iron Casting from Iwate',
    '南部鉄器',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1975, '岩手県盛岡市・奥州市', 'Morioka / Oshu, Iwate Prefecture', 110, 'pending_facts'
  ),
  (
    'yamagata-imono',
    'Yamagata Imono: Iron Casting from Yamagata',
    '山形鋳物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1975, '山形県山形市', 'Yamagata, Yamagata Prefecture', 120, 'pending_facts'
  ),
  (
    'kyo-kanamono',
    'Kyo Kanamono: Metal Fittings from Kyoto',
    '京金物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 130, 'pending_facts'
  ),
  (
    'satsuma-sukigane',
    'Satsuma Suzu-nishiki: Pewter Craft from Kagoshima',
    '薩摩錫器',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '鹿児島県鹿児島市', 'Kagoshima, Kagoshima Prefecture', 140, 'pending_facts'
  ),
  (
    'tsubame-tsuiki-douki',
    'Tsubame Tsuiki Douki: Hammered Copper from Niigata',
    '燕鎚起銅器',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1981, '新潟県燕市', 'Tsubame, Niigata Prefecture', 150, 'pending_facts'
  ),
  (
    'sakai-uchihamono',
    'Sakai Uchihamono: Forged Cutlery from Osaka',
    '堺打刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1982, '大阪府堺市', 'Sakai, Osaka Prefecture', 160, 'pending_facts'
  ),
  (
    'echizen-uchihamono',
    'Echizen Uchihamono: Forged Blades from Fukui',
    '越前打刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1979, '福井県越前市', 'Echizen, Fukui Prefecture', 170, 'pending_facts'
  ),
  (
    'sanjo-uchihamono',
    'Sanjo Uchihamono: Forged Tools from Niigata',
    '三条打刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '新潟県三条市', 'Sanjo, Niigata Prefecture', 180, 'pending_facts'
  ),
  (
    'tosa-hamono',
    'Tosa Hamono: Traditional Blades from Kochi',
    '土佐刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1976, '高知県香美市', 'Kami, Kochi Prefecture', 190, 'pending_facts'
  ),
  (
    'banshu-hamono',
    'Banshu Hamono: Scissors and Cutlery from Hyogo',
    '播州刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '兵庫県小野市', 'Ono, Hyogo Prefecture', 200, 'pending_facts'
  ),
  (
    'seki-hamono',
    'Seki Hamono: Blades from the City of Swords in Gifu',
    '関刃物',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1979, '岐阜県関市', 'Seki, Gifu Prefecture', 210, 'pending_facts'
  ),
  (
    'nagasaki-bekko',
    'Nagasaki Bekko: Tortoiseshell Craft from Nagasaki',
    '長崎べっ甲',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, 1997, '長崎県長崎市', 'Nagasaki, Nagasaki Prefecture', 220, 'pending_facts'
  ),
  (
    'kyoto-nishiki-ori-kinzoku',
    'Kyoto Zogan: Metal Inlay Work from Kyoto',
    '京象嵌',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 230, 'pending_facts'
  ),
  (
    'osaka-naniwa-suzuki',
    'Osaka Naniwa Pewterwork: Traditional Tin Craft from Osaka',
    '大阪錫器',
    'metalwork', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-metalwork'),
    true, NULL, '大阪府大阪市', 'Osaka, Osaka Prefecture', 240, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 8: SPOKE ARTICLES — 人形・こけし / Dolls & Kokeshi
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'hakata-ningyo',
    'Hakata Ningyo: Unglazed Clay Dolls from Fukuoka',
    '博多人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1976, '福岡県福岡市', 'Fukuoka, Fukuoka Prefecture', 100, 'pending_facts'
  ),
  (
    'kyo-ningyo',
    'Kyo Ningyo: Sophisticated Dolls from Kyoto',
    '京人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1977, '京都府京都市', 'Kyoto, Kyoto Prefecture', 110, 'pending_facts'
  ),
  (
    'edo-kimekomi-ningyo',
    'Edo Kimekomi Ningyo: Carved Wood Dolls from Tokyo',
    '江戸木目込人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1978, '東京都', 'Tokyo', 120, 'pending_facts'
  ),
  (
    'iwatsuki-ningyo',
    'Iwatsuki Ningyo: Traditional Dolls from Saitama',
    '岩槻人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1979, '埼玉県さいたま市岩槻区', 'Iwatsuki, Saitama Prefecture', 130, 'pending_facts'
  ),
  (
    'imado-ningyo',
    'Imado Ningyo: Lucky Cat Clay Dolls from Tokyo',
    '今戸人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '東京都台東区', 'Taito, Tokyo', 140, 'pending_facts'
  ),
  (
    'miharu-hariko',
    'Miharu Hariko: Papier-Mache Toys from Fukushima',
    '三春張り子',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '福島県田村郡三春町', 'Miharu, Fukushima Prefecture', 150, 'pending_facts'
  ),
  (
    'miyagi-kokeshi',
    'Miyagi Kokeshi: Traditional Wooden Dolls from Miyagi',
    '宮城伝統こけし',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1981, '宮城県仙台市・大崎市', 'Sendai / Osaki, Miyagi Prefecture', 160, 'pending_facts'
  ),
  (
    'naruko-kokeshi',
    'Naruko Kokeshi: Squeaking Wooden Dolls from Miyagi',
    '鳴子こけし',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, 1981, '宮城県大崎市鳴子温泉', 'Naruko Onsen, Osaki, Miyagi Prefecture', 170, 'pending_facts'
  ),
  (
    'tsugaruburi-kokeshi',
    'Tsugaru Kokeshi: Painted Wooden Dolls from Aomori',
    '津軽こけし',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '青森県弘前市', 'Hirosaki, Aomori Prefecture', 180, 'pending_facts'
  ),
  (
    'toge-kokeshi',
    'Toge Kokeshi: Traditional Wooden Dolls from Yamagata',
    '遠刈田こけし',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '宮城県刈田郡蔵王町', 'Zaogawa, Miyagi Prefecture', 190, 'pending_facts'
  ),
  (
    'edo-ningyo',
    'Edo Ningyo: Traditional Craft Dolls from Tokyo',
    '江戸人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '東京都', 'Tokyo', 200, 'pending_facts'
  ),
  (
    'kyoto-nishiki-ningyo',
    'Kyoto Gofun Ningyo: Oyster-Shell Lacquered Dolls from Kyoto',
    '京御所人形',
    'dolls', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-dolls'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 210, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 9: SPOKE ARTICLES — 和紙 / Washi Paper
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'echizen-washi',
    'Echizen Washi: Traditional Handmade Paper from Fukui',
    '越前和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1976, '福井県越前市', 'Echizen, Fukui Prefecture', 100, 'pending_facts'
  ),
  (
    'tosa-washi',
    'Tosa Washi: Strong Handmade Paper from Kochi',
    '土佐和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1976, '高知県いの町', 'Ino, Kochi Prefecture', 110, 'pending_facts'
  ),
  (
    'mino-washi',
    'Mino Washi: Fine Handmade Paper from Gifu',
    '美濃和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1985, '岐阜県美濃市', 'Mino, Gifu Prefecture', 120, 'pending_facts'
  ),
  (
    'nishinouchi-washi',
    'Nishinouchi Washi: Strong Handmade Paper from Ibaraki',
    '西ノ内和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1977, '茨城県常陸大宮市', 'Hitachiomiya, Ibaraki Prefecture', 130, 'pending_facts'
  ),
  (
    'uchiyama-gami',
    'Uchiyama Gami: Handmade Paper from Nagano',
    '内山紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1978, '長野県飯山市', 'Iiyama, Nagano Prefecture', 140, 'pending_facts'
  ),
  (
    'awa-washi',
    'Awa Washi: Traditional Handmade Paper from Tokushima',
    '阿波和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1976, '徳島県吉野川市', 'Yoshinogawa, Tokushima Prefecture', 150, 'pending_facts'
  ),
  (
    'ozu-washi',
    'Ozu Washi: Handmade Paper from Ehime',
    '大洲和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, NULL, '愛媛県大洲市', 'Ozu, Ehime Prefecture', 160, 'pending_facts'
  ),
  (
    'ogawa-washi',
    'Ogawa Washi / Hosokawa Shi: Traditional Paper from Saitama',
    '小川和紙（細川紙）',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1978, '埼玉県比企郡小川町', 'Ogawa, Saitama Prefecture', 170, 'pending_facts'
  ),
  (
    'inshu-washi',
    'Inshu Washi: Handmade Paper from Tottori',
    '因州和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1975, '鳥取県鳥取市', 'Tottori, Tottori Prefecture', 180, 'pending_facts'
  ),
  (
    'sekishu-washi',
    'Sekishu Washi: Ancient Handmade Paper from Shimane',
    '石州和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, 1989, '島根県浜田市', 'Hamada, Shimane Prefecture', 190, 'pending_facts'
  ),
  (
    'yamakawa-washi',
    'Yamakawa Washi: Traditional Paper from Fukuoka',
    '八女和紙',
    'washi', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-washi'),
    true, NULL, '福岡県八女市', 'Yame, Fukuoka Prefecture', 200, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 10: SPOKE ARTICLES — 文具 / Stationery
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'kumano-fude',
    'Kumano Fude: Traditional Writing Brushes from Hiroshima',
    '熊野筆',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 1975, '広島県安芸郡熊野町', 'Kumano, Hiroshima Prefecture', 100, 'pending_facts'
  ),
  (
    'nara-fude',
    'Nara Fude: Traditional Calligraphy Brushes from Nara',
    '奈良筆',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 1977, '奈良県奈良市', 'Nara, Nara Prefecture', 110, 'pending_facts'
  ),
  (
    'toyohashi-fude',
    'Toyohashi Fude: Quality Brushes from Aichi',
    '豊橋筆',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 1976, '愛知県豊橋市', 'Toyohashi, Aichi Prefecture', 120, 'pending_facts'
  ),
  (
    'ogatsu-suzuri',
    'Ogatsu Suzuri: Ink Stone from Miyagi',
    '雄勝硯',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 1985, '宮城県石巻市雄勝町', 'Ogatsu, Ishinomaki, Miyagi Prefecture', 130, 'pending_facts'
  ),
  (
    'akama-suzuri',
    'Akama Suzuri: Fine Ink Stone from Yamaguchi',
    '赤間硯',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 1976, '山口県宇部市', 'Ube, Yamaguchi Prefecture', 140, 'pending_facts'
  ),
  (
    'edo-kiriko-glass',
    'Edo Kiriko: Cut Glass from Tokyo',
    '江戸切子',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, 2002, '東京都墨田区・江東区', 'Sumida / Koto, Tokyo', 150, 'pending_facts'
  ),
  (
    'suruga-hitsumono',
    'Suruga Hitsumono: Lacquered Woodwork with Bamboo Inlay from Shizuoka',
    '駿河ひな具',
    'stationery', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stationery'),
    true, NULL, '静岡県静岡市', 'Shizuoka, Shizuoka Prefecture', 160, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 11: SPOKE ARTICLES — 石工品 / Stonework
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'okazaki-sekkohin',
    'Okazaki Sekkohin: Stone Crafts from Aichi',
    '岡崎石工品',
    'stonework', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stonework'),
    true, 1979, '愛知県岡崎市', 'Okazaki, Aichi Prefecture', 100, 'pending_facts'
  ),
  (
    'makabe-sekkohin',
    'Makabe Sekkohin: Stone Crafts from Ibaraki',
    '真壁石工品',
    'stonework', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stonework'),
    true, 1979, '茨城県桜川市', 'Sakuragawa, Ibaraki Prefecture', 110, 'pending_facts'
  ),
  (
    'mikage-sekkohin',
    'Mikage Sekkohin: Granite Craft from Hyogo',
    '御影石工品',
    'stonework', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-stonework'),
    true, NULL, '兵庫県神戸市', 'Kobe, Hyogo Prefecture', 120, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 12: SPOKE ARTICLES — 仏壇・仏具 / Buddhist Crafts
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'nagoya-butsudan',
    'Nagoya Butsudan: Buddhist Home Altar from Aichi',
    '名古屋仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1977, '愛知県名古屋市', 'Nagoya, Aichi Prefecture', 100, 'pending_facts'
  ),
  (
    'mikawa-butsudan',
    'Mikawa Butsudan: Buddhist Altar from Aichi',
    '三河仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1980, '愛知県岡崎市・刈谷市', 'Okazaki / Kariya, Aichi Prefecture', 110, 'pending_facts'
  ),
  (
    'kanazawa-butsudan',
    'Kanazawa Butsudan: Ornate Buddhist Altar from Ishikawa',
    '金沢仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1976, '石川県金沢市', 'Kanazawa, Ishikawa Prefecture', 120, 'pending_facts'
  ),
  (
    'kyo-butsudan',
    'Kyo Butsudan: Traditional Buddhist Altar from Kyoto',
    '京仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1976, '京都府京都市', 'Kyoto, Kyoto Prefecture', 130, 'pending_facts'
  ),
  (
    'osaka-butsudan',
    'Osaka Butsudan: Buddhist Altar from Osaka',
    '大阪仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1977, '大阪府大阪市', 'Osaka, Osaka Prefecture', 140, 'pending_facts'
  ),
  (
    'nagasaki-butsudan',
    'Nagasaki Butsudan: Buddhist Altar from Nagasaki',
    '長崎仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1976, '長崎県長崎市', 'Nagasaki, Nagasaki Prefecture', 150, 'pending_facts'
  ),
  (
    'hikone-butsudan',
    'Hikone Butsudan: Buddhist Altar from Shiga',
    '彦根仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1975, '滋賀県彦根市', 'Hikone, Shiga Prefecture', 160, 'pending_facts'
  ),
  (
    'yame-fukushima-butsudan',
    'Yame Fukushima Butsudan: Buddhist Altar from Fukuoka',
    '八女福島仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, 1976, '福岡県八女市', 'Yame, Fukuoka Prefecture', 170, 'pending_facts'
  ),
  (
    'fukuoka-hakata-butsudan',
    'Hakata Butsudan: Buddhist Altar from Fukuoka',
    '福岡仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, NULL, '福岡県福岡市', 'Fukuoka, Fukuoka Prefecture', 180, 'pending_facts'
  ),
  (
    'tokai-butsugu',
    'Tokai Butsudan: Buddhist Altar from Mie',
    '三重仏壇',
    'buddhist', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-buddhist-crafts'),
    true, NULL, '三重県津市', 'Tsu, Mie Prefecture', 190, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- STEP 13: SPOKE ARTICLES — その他 / Other Traditional Crafts
-- =============================================================================

INSERT INTO craft_items (slug, name_en, name_ja, category, article_type, pillar_id, meti_designated, meti_designation_year, region_ja, region_en, priority, status)
VALUES
  (
    'satsuma-kiriko',
    'Satsuma Kiriko: Cut Glass from Kagoshima',
    '薩摩切子',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '鹿児島県鹿児島市', 'Kagoshima, Kagoshima Prefecture', 100, 'pending_facts'
  ),
  (
    'ryukyu-glass',
    'Ryukyu Glass: Colorful Recycled Glass from Okinawa',
    '琉球ガラス',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '沖縄県糸満市・那覇市', 'Itoman / Naha, Okinawa Prefecture', 110, 'pending_facts'
  ),
  (
    'kyoto-kyo-sensu',
    'Kyo Sensu: Folding Fans from Kyoto',
    '京扇子',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1977, '京都府京都市', 'Kyoto, Kyoto Prefecture', 120, 'pending_facts'
  ),
  (
    'edo-sensu',
    'Edo Sensu: Traditional Folding Fans from Tokyo',
    '江戸扇子',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '東京都', 'Tokyo', 130, 'pending_facts'
  ),
  (
    'kyoto-nishiki-ori-obi',
    'Kyo Kamon: Family Crest Dyeing from Kyoto',
    '京紋章',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 140, 'pending_facts'
  ),
  (
    'suruga-himo',
    'Suruga Himo: Traditional Braided Cord from Shizuoka',
    '駿河組紐',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '静岡県静岡市', 'Shizuoka, Shizuoka Prefecture', 150, 'pending_facts'
  ),
  (
    'edo-kumihimo',
    'Edo Kumihimo: Braided Silk Cords from Tokyo',
    '江戸組紐',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1976, '東京都', 'Tokyo', 160, 'pending_facts'
  ),
  (
    'iga-kumihimo',
    'Iga Kumihimo: Traditional Braided Cords from Mie',
    '伊賀組紐',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1976, '三重県伊賀市', 'Iga, Mie Prefecture', 170, 'pending_facts'
  ),
  (
    'kyoto-nishijin-tsuzure',
    'Nishijin Tsuzure-ori: Tapestry Weaving from Kyoto',
    '西陣爪掻本綴織',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 180, 'pending_facts'
  ),
  (
    'boshu-uchiwa',
    'Boshu Uchiwa: Round Fans from Chiba',
    '房州うちわ',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 2003, '千葉県南房総市', 'Minamiboso, Chiba Prefecture', 190, 'pending_facts'
  ),
  (
    'kyo-uchiwa',
    'Kyo Uchiwa: Round Fans from Kyoto',
    '京うちわ',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1977, '京都府京都市', 'Kyoto, Kyoto Prefecture', 200, 'pending_facts'
  ),
  (
    'marugame-uchiwa',
    'Marugame Uchiwa: Round Fans from Kagawa',
    '丸亀うちわ',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '香川県丸亀市', 'Marugame, Kagawa Prefecture', 210, 'pending_facts'
  ),
  (
    'echizen-washi-hanafuda',
    'Karuta: Traditional Japanese Playing Cards',
    '花かるた',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 220, 'pending_facts'
  ),
  (
    'kyoto-nishiki-tatami',
    'Tatami: Traditional Japanese Floor Mats',
    '畳',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '熊本県八代市', 'Yatsushiro, Kumamoto Prefecture', 230, 'pending_facts'
  ),
  (
    'bizen-hariko',
    'Hariko: Papier-Mache Folk Toys',
    '張り子',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '岡山県', 'Okayama Prefecture', 240, 'pending_facts'
  ),
  (
    'ise-katagami',
    'Ise Katagami: Stencil Paper from Mie',
    '伊勢型紙',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1983, '三重県鈴鹿市', 'Suzuka, Mie Prefecture', 250, 'pending_facts'
  ),
  (
    'suruga-oshi-e',
    'Suruga Oshi-e Hagoita: Relief Art Paddle from Shizuoka',
    '押絵羽子板',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '東京都墨田区', 'Sumida, Tokyo', 260, 'pending_facts'
  ),
  (
    'nishijin-kinkaku',
    'Kanazawa Hakuichi: Gold Leaf Crafts from Ishikawa',
    '金沢箔',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1977, '石川県金沢市', 'Kanazawa, Ishikawa Prefecture', 270, 'pending_facts'
  ),
  (
    'kyoto-nishiki-kinkaku',
    'Kyo Yuzen Kinkaku: Gold-Leaf Decorated Kyoto Textiles',
    '京金彩',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 280, 'pending_facts'
  ),
  (
    'kyoto-ningyo-accessories',
    'Kyo Kanagu: Metal Accessories from Kyoto',
    '京金具',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 290, 'pending_facts'
  ),
  (
    'hakata-ori-obi',
    'Hakata Ori Obi: Obi Sashes from Fukuoka',
    '博多帯',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '福岡県福岡市', 'Fukuoka, Fukuoka Prefecture', 300, 'pending_facts'
  ),
  (
    'owari-cloisonne',
    'Owari Shippo: Cloisonne Enamel from Aichi',
    '尾張七宝',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, 1995, '愛知県あま市', 'Ama, Aichi Prefecture', 310, 'pending_facts'
  ),
  (
    'kyoto-kodo',
    'Kyo Kodo: Incense Ceremony Tools from Kyoto',
    '京香道具',
    'other', 'spoke',
    (SELECT id FROM craft_items WHERE slug = 'japanese-other-crafts'),
    true, NULL, '京都府京都市', 'Kyoto, Kyoto Prefecture', 320, 'pending_facts'
  )
ON CONFLICT (slug) DO NOTHING;
