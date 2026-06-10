export const maxDuration = 60;

import { getCraftSources, saveCraftFacts } from '@/lib/crafts-supabase';
import { callClaude, parseJSON } from '@/lib/claude';

const SYSTEM = `あなたは日本の伝統工芸品の専門家です。与えられたテキストから工芸品に関する事実を抽出し、以下のJSON配列形式で返してください。必ずJSON配列のみ返してください。

[
  {
    "fact_type": "definition|history|technique|process|material|stat|identification|region|designation",
    "claim": "事実の説明文（英語または日本語）",
    "year": null または 数値（年号が関連する場合）,
    "value": null または 文字列/数値（統計値などがある場合）,
    "quote_basis": null または "原文からの引用や根拠となる文章"
  }
]

fact_typeの定義:
- definition: 工芸品の定義・概要
- history: 歴史・起源
- technique: 技法・技術
- process: 製造工程
- material: 使用素材
- stat: 統計・数値データ
- identification: 識別・特徴
- region: 産地・地域
- designation: 指定・認定（METI等）`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await getCraftSources(id);
    const sourcesWithText = sources.filter((s) => s.raw_text && s.raw_text.trim().length > 0);

    if (sourcesWithText.length === 0) {
      return Response.json({ processed: 0, message: 'raw_textがあるソースがありません' });
    }

    let processed = 0;
    for (const source of sourcesWithText) {
      try {
        const userMessage = `以下のテキストから工芸品の事実を抽出してください:\n\n【ソース: ${source.publisher ?? source.url}】\n${source.raw_text}`;
        const raw = await callClaude(SYSTEM, userMessage);
        const facts = parseJSON<Array<{
          fact_type: string;
          claim: string;
          year?: number | null;
          value?: string | number | null;
          quote_basis?: string | null;
        }>>(raw);

        if (facts && Array.isArray(facts) && facts.length > 0) {
          await saveCraftFacts(id, source.id, facts);
          processed++;
        }
      } catch (e) {
        console.error(`Source ${source.id} extraction error:`, e);
        // Continue with next source
      }
    }

    return Response.json({ processed });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
