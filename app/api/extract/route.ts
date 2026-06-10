export const maxDuration = 60;

import { callClaude, parseJSON } from "@/lib/claude";
import { saveProduct, updateProductInfo } from "@/lib/supabase";
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

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EchoCraftsBot/1.0)" },
  });
  if (!res.ok) throw new Error(`URLの取得に失敗しました: ${res.status}`);
  const html = await res.text();
  // HTMLタグを除去してテキストのみ抽出
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000); // トークン節約のため先頭8000文字
  return text;
}

export async function POST(req: Request) {
  try {
    const { urls, productId: incomingProductId } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: "URLが必要です" }, { status: 400 });
    }

    // URLのページ内容を取得
    const pageContents = await Promise.all(
      urls.map(async (url: string) => {
        try {
          const text = await fetchPageText(url);
          return `【URL: ${url}】\n${text}`;
        } catch (e) {
          console.error("URL fetch error:", e);
          return `【URL: ${url}】\n（取得失敗: ${e instanceof Error ? e.message : String(e)}）`;
        }
      })
    );

    console.log("Page content length:", pageContents[0]?.length);

    const userMessage = `以下の商品ページのテキストから情報を抽出してください:\n\n${pageContents.join("\n\n")}`;
    const raw = await callClaude(SYSTEM, userMessage);

    console.log("Claude raw response:", raw.slice(0, 200));

    const info = parseJSON<ProductInfo>(raw);
    if (!info) {
      return Response.json({ error: `JSON解析失敗: ${raw.slice(0, 300)}` }, { status: 500 });
    }

    // Supabase保存（エラーは無視してフロー継続）
    let productId: string | undefined = incomingProductId;
    let dbError: string | undefined;
    try {
      if (!productId) {
        productId = await saveProduct({ urls, q1: "", q2: "" });
      }
      if (productId) {
        await updateProductInfo(productId, { ...info, phase_completed: 1 });
      }
    } catch (dbErr) {
      dbError = dbErr instanceof Error ? dbErr.message : JSON.stringify(dbErr);
      console.error("Supabase write error (extract):", dbErr);
    }

    // dbErrorをレスポンスに含める（一時デバッグ用）
    return Response.json({ ...info, productId, _dbError: dbError });
  } catch (e) {
    console.error("Extract error:", e);
    return Response.json(
      { error: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
