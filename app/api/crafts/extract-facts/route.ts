import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { callClaude, parseJSON } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';
import type { CraftFact, FactType } from '@/types/crafts';

export const maxDuration = 60;

interface FactExtracted {
  fact_type: FactType;
  claim: string;
  year: number | null;
  value: string | number | null;
  quote_basis: string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { craft_source_id } = body as { craft_source_id: string };

    if (!craft_source_id) {
      return NextResponse.json({ error: 'craft_source_id is required' }, { status: 400 });
    }

    const db = getSupabaseClient();

    // 1. Fetch source from Supabase
    const { data: source, error: sourceError } = await db
      .from('craft_sources')
      .select('*')
      .eq('id', craft_source_id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found', detail: sourceError?.message }, { status: 404 });
    }

    let rawText: string = source.raw_text ?? '';

    // 2. If raw_text is null/empty, fetch URL, strip HTML, save
    if (!rawText.trim()) {
      const fetchRes = await fetch(source.url, {
        headers: { 'User-Agent': 'EchoCrafts-ArticleGen/1.0' },
      });
      if (!fetchRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch source URL: ${fetchRes.status} ${fetchRes.statusText}` },
          { status: 502 }
        );
      }
      const html = await fetchRes.text();
      rawText = stripHtml(html);

      const { error: updateSourceError } = await db
        .from('craft_sources')
        .update({ raw_text: rawText, fetched_at: new Date().toISOString() })
        .eq('id', craft_source_id);

      if (updateSourceError) {
        console.error('Failed to save raw_text:', updateSourceError);
      }
    }

    // 3. Read system prompt
    const promptPath = join(process.cwd(), 'prompts', 'crafts', 'extract_facts.md');
    const systemPrompt = readFileSync(promptPath, 'utf-8');

    // 4. Call Claude with truncated raw_text
    const claudeResponse = await callClaude(systemPrompt, rawText.slice(0, 12000));

    // 5. Parse JSON array
    const extracted = parseJSON<FactExtracted[]>(claudeResponse);
    if (!extracted || !Array.isArray(extracted)) {
      return NextResponse.json(
        { error: 'Failed to parse facts from Claude response', raw: claudeResponse.slice(0, 500) },
        { status: 422 }
      );
    }

    const craftItemId: string = source.craft_item_id;

    // 6. DELETE existing craft_facts for this source_id (re-extraction replaces)
    const { error: deleteError } = await db
      .from('craft_facts')
      .delete()
      .eq('source_id', craft_source_id);

    if (deleteError) {
      console.error('Failed to delete existing facts:', deleteError);
    }

    // 7. INSERT all facts with confidence='extracted'
    const factsToInsert = extracted.map((f) => ({
      craft_item_id: craftItemId,
      source_id: craft_source_id,
      fact_type: f.fact_type,
      content: {
        claim: f.claim,
        year: f.year ?? null,
        value: f.value ?? null,
        quote_basis: f.quote_basis ?? null,
      },
      confidence: 'extracted' as const,
      reviewer_note: null,
    }));

    const { data: insertedFacts, error: insertError } = await db
      .from('craft_facts')
      .insert(factsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert facts', detail: insertError.message },
        { status: 500 }
      );
    }

    // 8. UPDATE craft_items.status = 'facts_review' only if currently 'pending_facts'
    const { data: item } = await db
      .from('craft_items')
      .select('status')
      .eq('id', craftItemId)
      .single();

    if (item?.status === 'pending_facts') {
      await db
        .from('craft_items')
        .update({ status: 'facts_review', updated_at: new Date().toISOString() })
        .eq('id', craftItemId);
    }

    // 9. Return result
    const facts = (insertedFacts ?? []) as CraftFact[];
    return NextResponse.json({ count: facts.length, facts });
  } catch (err) {
    console.error('extract-facts error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
