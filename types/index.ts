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
}

export type Q1Value = "interview_yes" | "interview_email" | "interview_no";
export type Q2Value = "position_definition" | "position_gift" | "position_auto";
