export const maxDuration = 60;

import { getCraftItem, updateCraftItem } from '@/lib/crafts-supabase';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const craft = await getCraftItem(id);
  if (!craft) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Get sources count
  const db = getSupabaseClient();
  const { count } = await db
    .from('craft_sources')
    .select('*', { count: 'exact', head: true })
    .eq('craft_item_id', id);

  return Response.json({ ...craft, sources_count: count ?? 0 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    await updateCraftItem(id, body);
    const updated = await getCraftItem(id);
    return Response.json(updated);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
