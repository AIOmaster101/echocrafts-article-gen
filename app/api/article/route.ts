export const maxDuration = 60;

import { callClaude } from "@/lib/claude";
import { saveArticle, updateProductInfo } from "@/lib/supabase";
import { Theme, ProductInfo, Source } from "@/types";

const SYSTEM_EN = `You are an expert content writer specializing in Japanese traditional crafts for international audiences.
Write a detailed, SEO-optimized blog article in English that follows AIO (AI Overview Optimization) best practices.

IMPORTANT: Output valid HTML only (no markdown). Use these tags:
- <h1> for the article title
- <h2> for main section headings (use question form: What is...? How does...? Why...?)
- <h3> for sub-headings
- <p> for paragraphs
- <strong> for emphasis
- <ul><li> for lists

Requirements:
- First <p> after <h1>: clear 1-2 sentence definition
- Include specific numbers, proper nouns, region names, artisan names
- End with a FAQ section using <h2>Frequently Asked Questions</h2> and 4-5 Q&A pairs
- Total length: 700-900 words
- Authoritative but accessible tone`;

const SYSTEM_JA = `あなたは日本の伝統工芸品の海外向けコンテンツライターです。
以下の英語記事を日本語に意訳してください（単純翻訳ではなく、日本語読者向けに最適化）。

IMPORTANT: Output valid HTML only. Preserve the same HTML structure (<h1>, <h2>, <h3>, <p>, <strong>, <ul><li>) but with Japanese text.
- 専門用語は日本語で自然に説明する
- 日本人読者が「当然知っている」背景情報は省略してよい`;

function buildReferencesHtml(urls: string[], productInfo: ProductInfo): string {
  const links = urls
    .map((url) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${productInfo.name_en || url}</a></li>`)
    .join("\n");
  return `\n<h2>References</h2>\n<ul>\n${links}\n</ul>`;
}

async function generateArticle(
  theme: Theme,
  productInfo: ProductInfo,
  interviewAnswers: string,
  urls: string[]
): Promise<{ contentEn: string; rawEn: string; refsHtml: string }> {
  const hasInterview = interviewAnswers?.trim().length > 0;
  const interviewSection = hasInterview
    ? `\n\n【職人インタビュー一次情報（Tier 1・最優先で使用）】\n${interviewAnswers}`
    : "";

  const userMsg = `記事タイトル: ${theme.title_en}
記事タイプ: ${theme.type}
商品情報: ${JSON.stringify(productInfo, null, 2)}${interviewSection}
AIO差別化ポイント: ${theme.key_blank}
参照すべき情報源階層: Tier1（一次情報）→ Tier2（学術・公的機関）→ Tier3（専門メディア）→ Tier4（一般メディア）の優先順`;

  const rawEn = await callClaude(SYSTEM_EN, userMsg);
  const refsHtml = buildReferencesHtml(urls, productInfo);
  const contentEn = rawEn + refsHtml;
  // 日本語は /api/article/translate で別途生成（タイムアウト対策）
  return { contentEn, rawEn, refsHtml };
}

export async function POST(req: Request) {
  try {
    const {
      themes,
      productInfo,
      interviewAnswers,
      urls,
      productId,
      themeId,
      themeIndex,
    }: { themes: Theme[]; productInfo: ProductInfo; interviewAnswers: string; urls: string[]; productId?: string; themeId?: string; themeIndex?: number } = await req.json();

    const hasInterview = interviewAnswers?.trim().length > 0;
    const sources: Source[] = [];
    if (hasInterview) {
      sources.push({ tier: "Tier 1", source: `${productInfo.artisan || "職人"}インタビュー`, note: "一次情報（独自取材）" });
    }
    sources.push(
      { tier: "Tier 1", source: productInfo.artisan ? `${productInfo.artisan} 公式ショップ` : "商品ページ", note: "商品仕様・価格・職人情報" },
      { tier: "Tier 2", source: "Encyclopaedia Britannica", note: "技法の定義・歴史的背景" },
      { tier: "Tier 2", source: "ResearchGate / 学術論文", note: "材料の化学的性質・耐久性データ" },
      { tier: "Tier 3", source: "Musubi Kiln Journal", note: "伝統工芸のケア・使用方法" },
      { tier: "Tier 3", source: "専門クラフトメディア", note: "工芸品の比較・市場情報" },
      { tier: "Tier 4", source: "Amazon / eBay レビュー", note: "購買者の視点・競合商品情報" }
    );

    const theme = themes[0];
    const { contentEn, rawEn, refsHtml } = await generateArticle(theme, productInfo, interviewAnswers, urls || []);

    // Supabase: 英語のみ先行保存（日本語はtranslate完了後に更新）
    try {
      if (themeId) {
        await saveArticle({
          themeId,
          themeIndex: themeIndex ?? 0,
          contentEn,
          contentJa: "", // 翻訳後に更新
          interviewAnswers: interviewAnswers || "",
          sources,
        });
      }
    } catch (dbErr) {
      console.error("Supabase write error (article):", dbErr);
    }

    return Response.json({ theme, contentEn, rawEn, refsHtml, sources });
  } catch (e) {
    console.error("Article generation error:", e);
    return Response.json(
      { error: `記事生成エラー: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
