-- 工芸百科事典の品目から派生記事を作成する機能のためのカラム追加
-- Supabase ダッシュボードの SQL Editor で実行してください

alter table products add column if not exists craft_item_id uuid references craft_items(id);
alter table products add column if not exists source_type text not null default 'url' check (source_type in ('url', 'craft'));
