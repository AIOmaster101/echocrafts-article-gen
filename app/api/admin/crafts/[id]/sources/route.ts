export const maxDuration = 60;

import { getCraftSources, createCraftSource, deleteCraftSource } from '@/lib/crafts-supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await getCraftSources(id);
    return Response.json(sources);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { url, title, publisher, tier } = body;
    if (!url) {
      return Response.json({ error: 'URLが必要です' }, { status: 400 });
    }
    const source = await createCraftSource({
      craft_item_id: id,
      url,
      title: title ?? null,
      publisher: publisher ?? null,
      tier: tier ?? 2,
      raw_text: null,
      fetched_at: null,
    });
    return Response.json(source, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get('source_id');
  if (!sourceId) {
    return Response.json({ error: 'source_id が必要です' }, { status: 400 });
  }
  try {
    await deleteCraftSource(sourceId);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
