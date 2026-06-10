create table craft_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ja text not null,
  category text not null,
  article_type text not null default 'spoke',
  pillar_id uuid references craft_items(id),
  meti_designated boolean default false,
  meti_designation_year int,
  region_ja text,
  region_en text,
  priority int default 100,
  status text not null default 'pending_facts',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table craft_sources (
  id uuid primary key default gen_random_uuid(),
  craft_item_id uuid not null references craft_items(id) on delete cascade,
  url text not null,
  title text,
  publisher text,
  tier int not null check (tier in (1, 2)),
  raw_text text,
  fetched_at timestamptz,
  created_at timestamptz default now()
);

create table craft_facts (
  id uuid primary key default gen_random_uuid(),
  craft_item_id uuid not null references craft_items(id) on delete cascade,
  source_id uuid not null references craft_sources(id) on delete cascade,
  fact_type text not null,
  content jsonb not null,
  confidence text default 'extracted',
  reviewer_note text,
  created_at timestamptz default now()
);

create table craft_articles (
  id uuid primary key default gen_random_uuid(),
  craft_item_id uuid not null references craft_items(id) on delete cascade unique,
  title text,
  body_html text,
  meta_description text,
  faq jsonb,
  json_ld jsonb,
  internal_links jsonb,
  generation_model text,
  generation_input_hash text,
  shopify_article_id bigint,
  shopify_blog_handle text default 'crafts',
  status text not null default 'pending_facts',
  pushed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

GRANT ALL ON public.craft_items TO service_role;
GRANT ALL ON public.craft_sources TO service_role;
GRANT ALL ON public.craft_facts TO service_role;
GRANT ALL ON public.craft_articles TO service_role;
