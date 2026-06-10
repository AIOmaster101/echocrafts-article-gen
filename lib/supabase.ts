import { createClient } from "@supabase/supabase-js";
import type { ProductInfo, Theme, Questions, Source, ProductRow, ThemeRow, ArticleRow, ProductWithData } from "@/types";

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ── 書き込みヘルパー（サーバーサイド専用） ─────────────────────────────

export async function saveProduct(data: {
  urls: string[];
  q1: string;
  q2: string;
}): Promise<string> {
  const db = getSupabaseClient();
  const { data: row, error } = await db
    .from("projects")
    .insert({ urls: data.urls, q1: data.q1, q2: data.q2, phase_completed: 0 })
    .select("id")
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateProductInfo(
  productId: string,
  info: Partial<ProductInfo> & { phase_completed?: number }
): Promise<void> {
  const db = getSupabaseClient();
  await db
    .from("projects")
    .update({ ...info, updated_at: new Date().toISOString() })
    .eq("id", productId);
}

export async function saveThemes(
  productId: string,
  themes: Theme[],
  opts?: { customizationInstruction?: string }
): Promise<ThemeRow[]> {
  const db = getSupabaseClient();
  // 既存テーマを削除してから再挿入
  await db.from("themes").delete().eq("product_id", productId);
  const rows = themes.map((t, i) => ({
    product_id: productId,
    type: t.type,
    title_en: t.title_en,
    title_ja: t.title_ja,
    score_aio: t.score_aio,
    score_demand: t.score_demand,
    score_sales: t.score_sales,
    score_cost: t.score_cost,
    aio_reason: t.aio_reason,
    key_blank: t.key_blank,
    priority: i,
    customization_instruction: opts?.customizationInstruction ?? null,
    is_customized: !!opts?.customizationInstruction,
  }));
  const { data, error } = await db.from("themes").insert(rows).select();
  if (error) throw error;
  return data as ThemeRow[];
}

export async function saveQuestions(
  themeId: string,
  questions: Questions
): Promise<void> {
  const db = getSupabaseClient();
  await db.from("interview_questions").delete().eq("theme_id", themeId);
  const rows = [
    ...questions.required.map((q, i) => ({ theme_id: themeId, category: "required", question: q.q, why: q.why, order_index: i })),
    ...questions.recommended.map((q, i) => ({ theme_id: themeId, category: "recommended", question: q.q, why: q.why, order_index: i })),
    ...questions.eeat.map((q, i) => ({ theme_id: themeId, category: "eeat", question: q.q, why: q.why, order_index: i })),
  ];
  await db.from("interview_questions").insert(rows);
}

export async function saveArticle(data: {
  themeId: string;
  themeIndex: number;
  contentEn: string;
  contentJa: string;
  interviewAnswers: string;
  sources: Source[];
}): Promise<void> {
  const db = getSupabaseClient();
  await db.from("articles").insert({
    theme_id: data.themeId,
    theme_index: data.themeIndex,
    content_en: data.contentEn,
    content_ja: data.contentJa,
    interview_answers: data.interviewAnswers || null,
    sources: data.sources,
    has_interview: data.interviewAnswers.trim().length > 0,
  });
}

// ── 読み込みヘルパー ────────────────────────────────────────────────────

export async function getProducts(): Promise<ProductRow[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

export async function getProductWithData(productId: string): Promise<ProductWithData | null> {
  const db = getSupabaseClient();
  const { data: product, error: pErr } = await db
    .from("projects")
    .select("*")
    .eq("id", productId)
    .single();
  if (pErr || !product) return null;

  const { data: themes } = await db
    .from("themes")
    .select("*")
    .eq("product_id", productId)
    .order("priority", { ascending: true });

  const themeIds = (themes ?? []).map((t: ThemeRow) => t.id);
  let articles: ArticleRow[] = [];
  if (themeIds.length > 0) {
    const { data: arts } = await db
      .from("articles")
      .select("*")
      .in("theme_id", themeIds)
      .order("theme_index", { ascending: true });
    articles = (arts ?? []) as ArticleRow[];
  }

  return { ...(product as ProductRow), themes: (themes ?? []) as ThemeRow[], articles };
}
