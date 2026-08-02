export const maxDuration = 60;

import { callClaude, parseJSON } from "@/lib/claude";
import { saveProduct, updateProductInfo } from "@/lib/supabase";
import { getCraftItem, getCraftFacts, getCraftSources } from "@/lib/crafts-supabase";
import { ProductInfo, CraftSourceRef } from "@/types";

const SYSTEM = `あなたは日本の工芸品越境ECの専門家です。工芸品目の基本情報とファクト（出典付きの検証済み情報）を読み込み、以下のJSON形式で情報を返してください。必ずJSONのみ返してください。
{
  "name_ja": "工芸品名（日本語）",
  "name_en": "工芸品名（英語候補）",
  "price_jpy": 0,
  "price_usd": 0,
  "material": "素材・技法の説明",
  "origin": "産地",
  "artisan": "",
  "use_cases": "主な用途・シーン",
  "category_en": "上位カテゴリ（英語）",
  "keywords": ["英語キーワード候補1", "英語キーワード候補2", "英語キーワード候補3"],
  "similar_products": ["欧米の類似品1", "欧米の類似品2"],
  "key_differentiator": "最大の差別化ポイント（1文）"
}

重要な注意点:
- これは特定の販売商品ではなく、工芸品カテゴリ全般についての情報です。特定の商品ページはありません。
- price_jpy / price_usd は不明なので常に 0 を返してください。
- artisan（職人名）は特定の個人が不明なため空文字列 "" を返してください。
- name_ja / name_en / material / origin / category_en / key_differentiator は、入力されたファクトに基づいてのみ記述してください。ファクトにない情報を創作しないでください。
- keywords / similar_products / use_cases は、ファクトの内容から合理的に推測できる範囲で構いません。`;

export async function POST(req: Request) {
  try {
    const { craftItemId }: { craftItemId?: string } = await req.json();
    if (!craftItemId) {
      return Response.json({ error: "craftItemIdが必要です" }, { status: 400 });
    }

    const item = await getCraftItem(craftItemId);
    if (!item) {
      return Response.json({ error: "工芸品が見つかりません" }, { status: 404 });
    }

    const allFacts = await getCraftFacts(craftItemId);
    const usableFacts = allFacts.filter((f) => f.confidence === "approved" || f.confidence === "edited");
    const facts = usableFacts.length > 0 ? usableFacts : allFacts.filter((f) => f.confidence !== "rejected");

    if (facts.length === 0) {
      return Response.json(
        { error: "この工芸品にはまだファクトが登録されていません。先に工芸百科事典側でファクトを収集してください。" },
        { status: 422 }
      );
    }

    const craftSources: CraftSourceRef[] = (await getCraftSources(craftItemId))
      .filter((s) => s.tier === 1 || s.tier === 2)
      .map((s) => ({ publisher: s.publisher, url: s.url, tier: s.tier }));

    const userMessage = `工芸品目情報:
${JSON.stringify(
  {
    name_en: item.name_en,
    name_ja: item.name_ja,
    category: item.category,
    region_en: item.region_en,
    region_ja: item.region_ja,
    meti_designated: item.meti_designated,
    meti_designation_year: item.meti_designation_year,
  },
  null,
  2
)}

ファクト一覧（出典付き）:
${JSON.stringify(
  facts.map((f) => ({ fact_type: f.fact_type, content: f.content, source: f.source })),
  null,
  2
)}`;

    const raw = await callClaude(SYSTEM, userMessage);
    const info = parseJSON<ProductInfo>(raw);
    if (!info) {
      return Response.json({ error: `JSON解析失敗: ${raw.slice(0, 300)}` }, { status: 500 });
    }

    let productId: string | undefined;
    let dbError: string | undefined;
    try {
      productId = await saveProduct({ urls: [], q1: "", q2: "", craftItemId, sourceType: "craft" });
      await updateProductInfo(productId, { ...info, phase_completed: 1 });
    } catch (dbErr) {
      dbError = dbErr instanceof Error ? dbErr.message : JSON.stringify(dbErr);
      console.error("Supabase write error (extract-from-craft):", dbErr);
    }

    return Response.json({
      ...info,
      productId,
      craftItemId,
      craftSlug: item.slug,
      craftSources,
      _dbError: dbError,
    });
  } catch (e) {
    console.error("Extract-from-craft error:", e);
    return Response.json(
      { error: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
