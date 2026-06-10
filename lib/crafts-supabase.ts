import { getSupabaseClient } from '@/lib/supabase';
import type {
  CraftItem,
  CraftSource,
  CraftFact,
  CraftArticle,
  FactConfidence,
} from '@/types/crafts';

// ── CraftItems ────────────────────────────────────────────────────────────────

export async function getCraftItems(): Promise<CraftItem[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('craft_items')
    .select('*')
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CraftItem[];
}

export async function getCraftItem(id: string): Promise<CraftItem | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('craft_items')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as CraftItem;
}

export async function createCraftItem(
  data: Omit<CraftItem, 'id' | 'created_at' | 'updated_at'>
): Promise<CraftItem> {
  const db = getSupabaseClient();
  const { data: row, error } = await db
    .from('craft_items')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as CraftItem;
}

export async function updateCraftItem(
  id: string,
  data: Partial<CraftItem>
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from('craft_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── CraftSources ──────────────────────────────────────────────────────────────

export async function getCraftSources(craftItemId: string): Promise<CraftSource[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('craft_sources')
    .select('*')
    .eq('craft_item_id', craftItemId);
  if (error) throw error;
  return (data ?? []) as CraftSource[];
}

export async function createCraftSource(
  data: Omit<CraftSource, 'id' | 'created_at'>
): Promise<CraftSource> {
  const db = getSupabaseClient();
  const { data: row, error } = await db
    .from('craft_sources')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as CraftSource;
}

export async function deleteCraftSource(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from('craft_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAndSaveRawText(sourceId: string): Promise<string> {
  const db = getSupabaseClient();

  // Get source URL
  const { data: source, error: fetchError } = await db
    .from('craft_sources')
    .select('url')
    .eq('id', sourceId)
    .single();
  if (fetchError || !source) throw new Error('Source not found');

  // Fetch and strip HTML (same pattern as app/api/extract/route.ts)
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EchoCraftsBot/1.0)' },
  });
  if (!res.ok) throw new Error(`URLの取得に失敗しました: ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  // Save to DB
  const { error: updateError } = await db
    .from('craft_sources')
    .update({ raw_text: text, fetched_at: new Date().toISOString() })
    .eq('id', sourceId);
  if (updateError) throw updateError;

  return text;
}

// ── CraftFacts ────────────────────────────────────────────────────────────────

export async function getCraftFacts(
  craftItemId: string
): Promise<(CraftFact & { source: Pick<CraftSource, 'publisher' | 'url' | 'tier'> })[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('craft_facts')
    .select('*, source:craft_sources(publisher, url, tier)')
    .eq('craft_item_id', craftItemId);
  if (error) throw error;
  return (data ?? []) as (CraftFact & { source: Pick<CraftSource, 'publisher' | 'url' | 'tier'> })[];
}

export async function saveCraftFacts(
  craftItemId: string,
  sourceId: string,
  facts: Array<{
    fact_type: string;
    claim: string;
    year?: number | null;
    value?: string | number | null;
    quote_basis?: string | null;
  }>
): Promise<void> {
  const db = getSupabaseClient();
  const rows = facts.map((f) => ({
    craft_item_id: craftItemId,
    source_id: sourceId,
    fact_type: f.fact_type,
    content: {
      claim: f.claim,
      year: f.year ?? null,
      value: f.value ?? null,
      quote_basis: f.quote_basis ?? null,
    },
    confidence: 'extracted',
  }));
  const { error } = await db.from('craft_facts').insert(rows);
  if (error) throw error;
}

export async function updateFactConfidence(
  factId: string,
  confidence: FactConfidence,
  claim?: string,
  year?: number | null,
  note?: string
): Promise<void> {
  const db = getSupabaseClient();

  type UpdatePayload = {
    confidence: FactConfidence;
    reviewer_note?: string;
    content?: Record<string, unknown>;
  };

  const payload: UpdatePayload = { confidence };
  if (note !== undefined) payload.reviewer_note = note;

  if (claim !== undefined || year !== undefined) {
    // Fetch current content then merge
    const { data: existing, error: fetchErr } = await db
      .from('craft_facts')
      .select('content')
      .eq('id', factId)
      .single();
    if (fetchErr) throw fetchErr;
    const currentContent = (existing?.content ?? {}) as Record<string, unknown>;
    payload.content = {
      ...currentContent,
      ...(claim !== undefined ? { claim } : {}),
      ...(year !== undefined ? { year } : {}),
    };
  }

  const { error } = await db.from('craft_facts').update(payload).eq('id', factId);
  if (error) throw error;
}

// ── CraftArticles ─────────────────────────────────────────────────────────────

export async function getCraftArticle(craftItemId: string): Promise<CraftArticle | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('craft_articles')
    .select('*')
    .eq('craft_item_id', craftItemId)
    .single();
  if (error) return null;
  return data as CraftArticle;
}

export async function saveCraftArticle(
  craftItemId: string,
  data: Partial<CraftArticle>
): Promise<CraftArticle> {
  const db = getSupabaseClient();
  const { error: upsertError, data: row } = await db
    .from('craft_articles')
    .upsert(
      { ...data, craft_item_id: craftItemId, updated_at: new Date().toISOString() },
      { onConflict: 'craft_item_id' }
    )
    .select()
    .single();
  if (upsertError) throw upsertError;
  return row as CraftArticle;
}

export async function updateCraftArticle(
  id: string,
  data: Partial<CraftArticle>
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from('craft_articles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
