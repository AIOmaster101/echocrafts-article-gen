export const maxDuration = 60;

import { fetchAndSaveRawText } from '@/lib/crafts-supabase';

export async function POST(req: Request) {
  try {
    const { source_id } = await req.json();
    if (!source_id) {
      return Response.json({ error: 'source_id が必要です' }, { status: 400 });
    }
    const text = await fetchAndSaveRawText(source_id);
    return Response.json({ success: true, chars: text.length });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
