-- products テーブルにサーベイ記事カラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS survey_article_html TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS survey_article_meta JSONB;
