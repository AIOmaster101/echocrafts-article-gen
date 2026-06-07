export const maxDuration = 60;

import { callClaude } from "@/lib/claude";
import { Questions, ProductInfo } from "@/types";

const SYSTEM = `あなたは丁寧なビジネスメールを書く専門家です。職人へのインタビュー依頼メール本文を日本語で作成してください。件名・本文を含む形で、自然で丁寧な文体で書いてください。`;

export async function POST(req: Request) {
  const { questions, productInfo }: { questions: Questions; productInfo: ProductInfo } = await req.json();

  const userMsg = `送り先: ${productInfo.artisan || "職人"}様 / ${productInfo.origin || "工房"}
記事タイトル: ${questions.theme_title}
必須質問:
${(questions.required || []).map((q, i) => `${i + 1}. ${q.q}`).join("\n")}
推奨質問:
${(questions.recommended || []).map((q, i) => `${i + 1}. ${q.q}`).join("\n")}`;

  const emailBody = await callClaude(SYSTEM, userMsg);
  return Response.json({ emailBody });
}
