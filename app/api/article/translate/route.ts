export const maxDuration = 60;

import { callClaude } from "@/lib/claude";
import { getSupabaseClient } from "@/lib/supabase";

const SYSTEM_JA = `あなたは日本の伝統工芸品の海外向けコンテンツライターです。
以下の英語記事を日本語に意訳してください（単純翻訳ではなく、日本語読者向けに最適化）。

IMPORTANT: Output valid HTML only. Preserve the same HTML structure (<h1>, <h2>, <h3>, <p>, <strong>, <ul><li>) but with Japanese text.
- 専門用語は日本語で自然に説明する
- 日本人読者が「当然知っている」背景情報は省略してよい`;

export async function POST(req: Request) {
  try {
    const { rawEn, refsHtml, themeId }: { rawEn: string; refsHtml: string; themeId?: string } = await req.json();

    const jaText = await callClaude(SYSTEM_JA, `以下の英語記事を日本語に意訳してください:\n\n${rawEn}`);
    const contentJa = jaText + refsHtml;

    // Supabase: content_jaを更新
    if (themeId) {
      try {
        const db = getSupabaseClient();
        await db.from("articles").update({ content_ja: contentJa }).eq("theme_id", themeId);
      } catch (dbErr) {
        console.error("Supabase update error (translate):", dbErr);
      }
    }

    return Response.json({ contentJa });
  } catch (e) {
    console.error("Translate error:", e);
    return Response.json(
      { error: `翻訳エラー: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
