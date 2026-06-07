-- EchoCrafts Article Generator — テーブル作成SQL
-- Supabase ダッシュボードの SQL Editor で実行してください

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  urls text[],
  q1 text,
  q2 text,
  name_ja text,
  name_en text,
  price_jpy int,
  price_usd int,
  material text,
  origin text,
  artisan text,
  use_cases text,
  category_en text,
  keywords text[],
  similar_products text[],
  key_differentiator text
);

create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  type text,
  title_en text,
  title_ja text,
  score_aio int,
  score_demand int,
  score_sales int,
  score_cost int,
  aio_reason text,
  key_blank text,
  priority int
);

create table if not exists interview_questions (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references themes(id) on delete cascade,
  category text,
  question text,
  why text,
  order_index int
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  theme_id uuid references themes(id) on delete cascade,
  content_en text,
  content_ja text,
  interview_answers text,
  sources jsonb,
  has_interview boolean default false
);
