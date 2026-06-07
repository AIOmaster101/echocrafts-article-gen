-- EchoCrafts Article Generator — テーブル作成SQL
-- Supabase ダッシュボードの SQL Editor で実行してください
-- （既存テーブルがある場合は ALTER TABLE 部分のみ実行してください）

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  phase_completed smallint not null default 0,
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

-- 既存テーブルへのカラム追加（初回セットアップ後に実行）
alter table products add column if not exists phase_completed smallint not null default 0;
alter table products add column if not exists updated_at timestamptz default now();

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
  priority int,
  customization_instruction text,
  is_customized boolean not null default false
);

alter table themes add column if not exists customization_instruction text;
alter table themes add column if not exists is_customized boolean not null default false;

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
  theme_index smallint not null default 0,
  content_en text,
  content_ja text,
  interview_answers text,
  sources jsonb,
  has_interview boolean default false
);

alter table articles add column if not exists theme_index smallint not null default 0;
