import { callClaude, parseJSON } from "@/lib/claude";
import { Questions, Theme, ProductInfo } from "@/types";

const SYSTEM = `あなたは日本工芸品の専門ライターです。記事テーマに基づき、職人・工房へのインタビュー質問リストをJSONで返してください。
必ず以下のJSON形式のみ返してください:
{
  "theme_title": "記事タイトル",
  "required": [{"q": "質問文", "why": "なぜこの情報が必要か（1文）"}],
  "recommended": [{"q": "質問文", "why": "記事の深みを出す理由（1文）"}],
  "eeat": [{"q": "質問文", "why": "E-E-A-T強化の理由（1文）"}]
}
required は3〜4問、recommended は3〜4問、eeat は2〜3問にしてください。
required の質問はネットに存在しない一次情報のみに絞ってください。`;

export async function POST(req: Request) {
  const { topTheme, productInfo, q1 }: { topTheme: Theme; productInfo: ProductInfo; q1: string } = await req.json();

  const raw = await callClaude(
    SYSTEM,
    `対象記事テーマ: ${JSON.stringify(topTheme, null, 2)}\n商品情報: ${JSON.stringify(productInfo, null, 2)}\n工房取材可否: ${q1}`
  );

  const qs = parseJSON<Questions>(raw);
  if (!qs) {
    return Response.json({ error: "質問生成に失敗しました" }, { status: 500 });
  }
  return Response.json(qs);
}
