export type CraftCategory = 'ceramics' | 'glass' | 'textiles' | 'lacquerware' | 'metalwork' | 'woodwork' | 'paper' | 'other';
export type ArticleType = 'pillar' | 'spoke';
export type CraftItemStatus = 'pending_facts' | 'facts_review' | 'generating' | 'article_review' | 'approved' | 'pushed' | 'published';
export type FactConfidence = 'extracted' | 'approved' | 'rejected' | 'edited';
export type FactType = 'definition' | 'history' | 'technique' | 'process' | 'material' | 'stat' | 'identification' | 'region' | 'designation';

export interface CraftItem {
  id: string;
  slug: string;
  name_en: string;
  name_ja: string;
  category: CraftCategory;
  article_type: ArticleType;
  pillar_id: string | null;
  meti_designated: boolean;
  meti_designation_year: number | null;
  region_ja: string | null;
  region_en: string | null;
  priority: number;
  status: CraftItemStatus;
  created_at: string;
  updated_at: string;
}

export interface CraftSource {
  id: string;
  craft_item_id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  tier: 1 | 2;
  raw_text: string | null;
  fetched_at: string | null;
  created_at: string;
}

export interface FactContent {
  claim: string;
  year?: number | null;
  value?: string | number | null;
  quote_basis?: string | null;
}

export interface CraftFact {
  id: string;
  craft_item_id: string;
  source_id: string;
  fact_type: FactType;
  content: FactContent;
  confidence: FactConfidence;
  reviewer_note: string | null;
  created_at: string;
}

export interface InternalLink {
  slug: string;
  anchor_text: string;
  placed: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CraftArticle {
  id: string;
  craft_item_id: string;
  title: string | null;
  body_html: string | null;
  meta_description: string | null;
  faq: FaqItem[] | null;
  json_ld: Record<string, unknown> | null;
  internal_links: InternalLink[] | null;
  generation_model: string | null;
  generation_input_hash: string | null;
  shopify_article_id: number | null;
  shopify_blog_handle: string;
  status: CraftItemStatus;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}
