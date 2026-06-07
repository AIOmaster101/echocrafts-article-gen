import { callClaude } from "@/lib/claude";
import { Theme, ProductInfo, Source } from "@/types";

const SYSTEM_EN = `You are an expert content writer specializing in Japanese traditional crafts for international audiences.
Write a detailed, SEO-optimized blog article in English that follows AIO (AI Overview Optimization) best practices:
- Start with a clear 1-2 sentence definition in the first paragraph
- Use H2 headings as questions (What is...? / How does...? / Why...?)
- Include specific numbers, proper nouns, region names, artisan names
- Include a FAQ section with 4-5 questions at the end
- Natural product links placement with descriptive anchor text
- Total length: 700-900 words
- Write in an authoritative but accessible tone`;

const SYSTEM_JA = `あなたは日本の伝統工芸品の海外向けコンテンツライターです。
以下の英語記事を自然な日本語に翻訳してください。翻訳ではなく、日本語読者向けに適切に意訳してください。
- 専門用語は日本語で自然に説明する
- 日本人読者が「当然知っている」背景情報は省略してよい
- 商品リンクのアンカーテキストも日本語に`;

export async function POST(req: Request) {
  const {
    topTheme,
    productInfo,
    interviewAnswers,
  }: { topTheme: Theme; productInfo: ProductInfo; interviewAnswers: string } = await req.json();

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

  const interviewSection = hasInterview
    ? `\n\n【職人インタビュー一次情報（Tier 1・最優先で使用）】\n${interviewAnswers}`
    : "";

  const userMsg = `記事タイトル: ${topTheme.title_en}
記事タイプ: ${topTheme.type}
商品情報: ${JSON.stringify(productInfo, null, 2)}${interviewSection}
AIO差別化ポイント: ${topTheme.key_blank}
参照すべき情報源階層: Tier1（一次情報）→ Tier2（学術・公的機関）→ Tier3（専門メディア）→ Tier4（一般メディア）の優先順`;

  const contentEn = await callClaude(SYSTEM_EN, userMsg);
  const contentJa = await callClaude(SYSTEM_JA, `以下の英語記事を日本語に訳してください:\n\n${contentEn}`);

  return Response.json({ contentEn, contentJa, sources });
}
