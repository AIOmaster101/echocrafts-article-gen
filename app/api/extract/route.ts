import { callClaude, parseJSON } from "@/lib/claude";
import { ProductInfo } from "@/types";

const SYSTEM = `あなたは日本の工芸品越境ECの専門家です。商品URLを読み込み、以下のJSON形式で情報を返してください。必ずJSONのみ返してください。
{
  "name_ja": "商品名（日本語）",
  "name_en": "商品名（英語候補）",
  "price_jpy": 数値,
  "price_usd": 数値（JPY÷150で概算）,
  "material": "素材・技法の説明",
  "origin": "産地・工房名",
  "artisan": "職人名",
  "use_cases": "主な用途・シーン",
  "category_en": "上位カテゴリ（英語）",
  "keywords": ["英語キーワード候補1", "英語キーワード候補2", "英語キーワード候補3"],
  "similar_products": ["欧米の類似品1", "欧米の類似品2"],
  "key_differentiator": "最大の差別化ポイント（1文）"
}`;

export async function POST(req: Request) {
  const { urls } = await req.json();
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return Response.json({ error: "URLが必要です" }, { status: 400 });
  }

  const raw = await callClaude(SYSTEM, `以下の商品URLから情報を抽出してください:\n${urls.join("\n")}`);
  const info = parseJSON<ProductInfo>(raw);
  if (!info) {
    return Response.json({ error: "商品情報の抽出に失敗しました" }, { status: 500 });
  }
  return Response.json(info);
}
