import { callClaude, parseJSON } from "@/lib/claude";
import { Theme, ProductInfo } from "@/types";

const SYSTEM = `あなたはAIO（AI検索最適化）の専門家です。商品情報を元に、4本の記事テーマをスコアリングして選定してください。
必ず以下のJSON配列のみ返してください（4件）:
[{
  "type": "faq|what|best|vs のいずれか",
  "title_en": "英語タイトル（実際に使えるもの）",
  "title_ja": "日本語タイトル",
  "score_aio": 0-30,
  "score_demand": 0-25,
  "score_sales": 0-25,
  "score_cost": 0-20,
  "aio_reason": "AIO空白の根拠（1文）",
  "key_blank": "このテーマで定義されていない最重要な情報（1文）"
}]
type は faq, what, best, vs の4種を1つずつ使ってください。

スコアリング基準:
- score_aio(30点): AIが現時点でまともな定義を返せないか
- score_demand(25点): Redditで質問されているか / Google Trendsで上昇中か
- score_sales(25点): 購買意図クエリに直結するか
- score_cost(20点): 工房取材なしで1週間以内に公開できるか`;

export async function POST(req: Request) {
  const { productInfo, q1, q2 }: { productInfo: ProductInfo; q1: string; q2: string } = await req.json();

  const raw = await callClaude(
    SYSTEM,
    `商品情報: ${JSON.stringify(productInfo, null, 2)}\nQ1（工房取材）: ${q1}\nQ2（優先ポジション）: ${q2}`
  );

  const scored = parseJSON<Theme[]>(raw);
  if (!scored || !Array.isArray(scored)) {
    return Response.json({ error: "テーマ選定に失敗しました" }, { status: 500 });
  }

  const sorted = [...scored].sort(
    (a, b) =>
      b.score_aio + b.score_demand + b.score_sales + b.score_cost -
      (a.score_aio + a.score_demand + a.score_sales + a.score_cost)
  );

  return Response.json(sorted);
}
