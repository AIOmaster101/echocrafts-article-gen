export interface ProductInfo {
  name_ja: string;
  name_en: string;
  price_jpy: number;
  price_usd: number;
  material: string;
  origin: string;
  artisan: string;
  use_cases: string;
  category_en: string;
  keywords: string[];
  similar_products: string[];
  key_differentiator: string;
}

export interface Theme {
  type: "faq" | "what" | "best" | "vs";
  title_en: string;
  title_ja: string;
  score_aio: number;
  score_demand: number;
  score_sales: number;
  score_cost: number;
  aio_reason: string;
  key_blank: string;
}

export interface QuestionItem {
  q: string;
  why: string;
}

export interface Questions {
  theme_title: string;
  required: QuestionItem[];
  recommended: QuestionItem[];
  eeat: QuestionItem[];
}

export interface Source {
  tier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4";
  source: string;
  note: string;
}

export interface Article {
  theme: Theme;
  contentEn: string;
  contentJa: string;
  rawEn?: string;    // 翻訳リクエスト用（一時保持）
  refsHtml?: string; // 翻訳リクエスト用（一時保持）
  jaLoading?: boolean; // 日本語生成中フラグ
}

export type Q1Value = "interview_yes" | "interview_email" | "interview_no";
export type Q2Value = "position_definition" | "position_gift" | "position_auto";

// DB row types
export interface ProductRow {
  id: string;
  created_at: string;
  updated_at: string;
  phase_completed: 0 | 1 | 2 | 3 | 4;
  urls: string[];
  q1: Q1Value;
  q2: Q2Value;
  name_ja: string | null;
  name_en: string | null;
  price_jpy: number | null;
  price_usd: number | null;
  material: string | null;
  origin: string | null;
  artisan: string | null;
  use_cases: string | null;
  category_en: string | null;
  keywords: string[] | null;
  similar_products: string[] | null;
  key_differentiator: string | null;
}

export interface ThemeRow extends Theme {
  id: string;
  product_id: string;
  priority: number;
  customization_instruction: string | null;
  is_customized: boolean;
}

export interface ArticleRow {
  id: string;
  created_at: string;
  theme_id: string;
  theme_index: number;
  content_en: string;
  content_ja: string;
  interview_answers: string | null;
  sources: Source[];
  has_interview: boolean;
}

export interface ProductWithData extends ProductRow {
  themes: ThemeRow[];
  articles: ArticleRow[];
}

// ArticleGenerator に initialState を注入するための型（再開フロー用）
export interface ArticleGeneratorInitialState {
  productId: string;
  phase: number;
  urls?: string;
  q1?: Q1Value;
  q2?: Q2Value;
  productInfo?: ProductInfo;
  themes?: Theme[];
  questions?: Questions;
}
