import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { callClaude, parseJSON } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';
import { buildArticleJsonLd, buildFaqJsonLd, buildBreadcrumbJsonLd, embedJsonLd } from '@/lib/crafts-jsonld';
import type { CraftItem, FaqItem, InternalLink } from '@/types/crafts';

export const maxDuration = 300;

interface FactExtracted {
  fact_type: string;
  claim: string;
  year: number | null;
  value: string | number | null;
  quote_basis: string | null;
}

interface ArticleClaudeResponse {
  title: string;
  meta_description: string;
  body_html: string;
  faq: FaqItem[];
  internal_links: InternalLink[];
}

interface FactInput {
  fact_type: string;
  claim: string;
  year?: number | null;
  value?: string | number | null;
  source: { publisher: string | null; url: string };
}

interface LinkTarget {
  slug: string;
  name: string;
  relation: 'pillar' | 'spoke' | 'sibling';
}

interface GenerateInput {
  item: {
    name_en: string;
    name_ja: string;
    category: string;
    region_en: string | null;
    article_type: string;
  };
  facts: FactInput[];
  link_targets: LinkTarget[];
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

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EchoCrafts-ArticleGen/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: ${res.status}`);
      return null;
    }
    const html = await res.text();
    return stripHtml(html).slice(0, 8000);
  } catch (e) {
    console.warn(`Error fetching ${url}:`, e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { craft_item_id } = body as { craft_item_id: string };

    if (!craft_item_id) {
      return NextResponse.json({ error: 'craft_item_id is required' }, { status: 400 });
    }

    const db = getSupabaseClient();

    // 1. Fetch craft_item
    const { data: item, error: itemError } = await db
      .from('craft_items')
      .select('*')
      .eq('id', craft_item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Craft item not found', detail: itemError?.message }, { status: 404 });
    }

    const craftItem = item as CraftItem;

    // 2. Build standard source URLs
    const nameEnEncoded = encodeURIComponent(craftItem.name_en.replace(/ /g, '_'));
    const nameJaEncoded = encodeURIComponent(craftItem.name_ja);

    const sourceConfigs = [
      {
        url: `https://kougeihin.jp/craft/${craftItem.slug}/`,
        publisher: '伝統工芸青山スクエア',
        tier: 1 as const,
        title: craftItem.name_en,
      },
      {
        url: `https://en.wikipedia.org/wiki/${nameEnEncoded}`,
        publisher: 'Wikipedia EN',
        tier: 2 as const,
        title: craftItem.name_en,
      },
      {
        url: `https://ja.wikipedia.org/wiki/${nameJaEncoded}`,
        publisher: 'Wikipedia JA',
        tier: 2 as const,
        title: craftItem.name_ja,
      },
    ];

    // 3. Fetch page content for each URL and upsert craft_sources
    let sourcesFetched = 0;
    const insertedSourceIds: string[] = [];

    for (const cfg of sourceConfigs) {
      const rawText = await fetchPageText(cfg.url);
      if (!rawText) continue;

      // Check if craft_source already exists
      const { data: existing } = await db
        .from('craft_sources')
        .select('id')
        .eq('craft_item_id', craft_item_id)
        .eq('url', cfg.url)
        .maybeSingle();

      let sourceId: string;

      if (existing) {
        // Update raw_text
        await db
          .from('craft_sources')
          .update({ raw_text: rawText, fetched_at: new Date().toISOString() })
          .eq('id', existing.id);
        sourceId = existing.id;
      } else {
        const { data: inserted, error: insertSourceError } = await db
          .from('craft_sources')
          .insert({
            craft_item_id,
            url: cfg.url,
            title: cfg.title,
            publisher: cfg.publisher,
            tier: cfg.tier,
            raw_text: rawText,
            fetched_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertSourceError || !inserted) {
          console.error('Failed to insert craft_source:', insertSourceError);
          continue;
        }
        sourceId = (inserted as { id: string }).id;
      }

      sourcesFetched++;
      insertedSourceIds.push(sourceId);
    }

    // Check if we have any existing sources if none were newly fetched
    if (insertedSourceIds.length === 0) {
      const { data: existingSources } = await db
        .from('craft_sources')
        .select('id')
        .eq('craft_item_id', craft_item_id)
        .not('raw_text', 'is', null);

      if (!existingSources || existingSources.length === 0) {
        return NextResponse.json(
          { error: 'すべてのソースの取得に失敗しました。ネットワークエラーまたは対象URLが存在しません。' },
          { status: 502 }
        );
      }

      // Use existing sources
      for (const s of existingSources) {
        insertedSourceIds.push((s as { id: string }).id);
      }
    }

    // 4. Extract facts for each source in parallel (auto-approved)
    let systemPrompt: string;
    try {
      const promptPath = join(process.cwd(), 'prompts', 'crafts', 'extract_facts.md');
      systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch {
      // Fallback inline prompt if file not found (Vercel bundle issue)
      systemPrompt = `You are a fact extraction assistant for Japanese traditional crafts. Given a webpage text, extract structured facts as a JSON array. Each fact should have: fact_type (one of: definition, history, region, technique, material, designation, artist, award, export, market), claim (string), year (number or null), value (string or null), quote_basis (brief quote from text or null). Return ONLY a valid JSON array, no other text.`;
    }
    let totalFactsExtracted = 0;

    const extractPromises = insertedSourceIds.map(async (sourceId) => {
      const { data: sourceRow } = await db
        .from('craft_sources')
        .select('raw_text')
        .eq('id', sourceId)
        .single();

      const rawText: string = (sourceRow as { raw_text: string | null } | null)?.raw_text ?? '';
      if (!rawText.trim()) return 0;

      let extracted: FactExtracted[] | null = null;
      try {
        const claudeResponse = await callClaude(systemPrompt, rawText.slice(0, 12000));
        extracted = parseJSON<FactExtracted[]>(claudeResponse);
      } catch (e) {
        console.error(`Failed to extract facts for source ${sourceId}:`, e);
        return 0;
      }

      if (!extracted || !Array.isArray(extracted)) return 0;

      // DELETE existing facts for this source (idempotent)
      await db.from('craft_facts').delete().eq('source_id', sourceId);

      // INSERT with confidence='approved' (auto-approved)
      const factsToInsert = extracted.map((f) => ({
        craft_item_id,
        source_id: sourceId,
        fact_type: f.fact_type,
        content: {
          claim: f.claim,
          year: f.year ?? null,
          value: f.value ?? null,
          quote_basis: f.quote_basis ?? null,
        },
        confidence: 'approved' as const,
        reviewer_note: null,
      }));

      const { data: insertedFacts, error: insertError } = await db
        .from('craft_facts')
        .insert(factsToInsert)
        .select('id');

      if (insertError) {
        console.error('Failed to insert facts:', insertError);
        return 0;
      }
      return (insertedFacts ?? []).length;
    });

    const factCounts = await Promise.all(extractPromises);
    totalFactsExtracted = factCounts.reduce((a, b) => a + b, 0);

    // 5. Quality guard
    const { data: approvedFacts } = await db
      .from('craft_facts')
      .select('fact_type')
      .eq('craft_item_id', craft_item_id)
      .eq('confidence', 'approved');

    const keyFactTypes = ['definition', 'history', 'region'];
    const hasKeyFacts = (approvedFacts ?? []).some((f: { fact_type: string }) =>
      keyFactTypes.includes(f.fact_type)
    );
    if (!hasKeyFacts) {
      console.warn(`Quality guard: no key facts (definition/history/region) found for craft_item_id=${craft_item_id}`);
    }

    // 6. Generate article (same logic as /api/crafts/generate-article)
    const { data: factsRaw, error: factsError } = await db
      .from('craft_facts')
      .select('fact_type, content, craft_sources(url, publisher)')
      .eq('craft_item_id', craft_item_id)
      .in('confidence', ['approved', 'edited']);

    if (factsError) {
      return NextResponse.json({ error: 'Failed to fetch facts for generation', detail: factsError.message }, { status: 500 });
    }

    const facts: FactInput[] = ((factsRaw ?? []) as unknown as Array<{
      fact_type: string;
      content: { claim: string; year?: number | null; value?: string | number | null; quote_basis?: string | null };
      craft_sources: { url: string; publisher: string | null } | { url: string; publisher: string | null }[] | null;
    }>).map(f => {
      const src = Array.isArray(f.craft_sources) ? f.craft_sources[0] ?? null : f.craft_sources;
      return {
        fact_type: f.fact_type,
        claim: f.content.claim,
        year: f.content.year ?? null,
        value: f.content.value ?? null,
        source: {
          publisher: src?.publisher ?? null,
          url: src?.url ?? '',
        },
      };
    });

    // Build link targets
    let linkTargets: LinkTarget[] = [];
    if (craftItem.article_type === 'spoke' && craftItem.pillar_id) {
      const { data: siblings } = await db
        .from('craft_items')
        .select('slug, name_en')
        .eq('pillar_id', craftItem.pillar_id)
        .eq('article_type', 'spoke')
        .neq('id', craft_item_id);

      linkTargets = ((siblings ?? []) as Array<{ slug: string; name_en: string }>).map(s => ({
        slug: s.slug,
        name: s.name_en,
        relation: 'sibling' as const,
      }));

      const { data: pillar } = await db
        .from('craft_items')
        .select('slug, name_en')
        .eq('id', craftItem.pillar_id)
        .single();

      if (pillar) {
        linkTargets.unshift({
          slug: (pillar as { slug: string; name_en: string }).slug,
          name: (pillar as { slug: string; name_en: string }).name_en,
          relation: 'pillar',
        });
      }
    } else if (craftItem.article_type === 'pillar') {
      const { data: spokes } = await db
        .from('craft_items')
        .select('slug, name_en')
        .eq('pillar_id', craft_item_id)
        .eq('article_type', 'spoke');

      linkTargets = ((spokes ?? []) as Array<{ slug: string; name_en: string }>).map(s => ({
        slug: s.slug,
        name: s.name_en,
        relation: 'spoke' as const,
      }));
    }

    const inputJson: GenerateInput = {
      item: {
        name_en: craftItem.name_en,
        name_ja: craftItem.name_ja,
        category: craftItem.category,
        region_en: craftItem.region_en,
        article_type: craftItem.article_type,
      },
      facts,
      link_targets: linkTargets,
    };

    const inputStr = JSON.stringify(inputJson);
    const generationInputHash = createHash('sha256').update(inputStr).digest('hex');

    const promptFile =
      craftItem.article_type === 'pillar'
        ? 'generate_article_pillar.md'
        : 'generate_article_spoke.md';
    let articleSystemPrompt: string;
    try {
      const articlePromptPath = join(process.cwd(), 'prompts', 'crafts', promptFile);
      articleSystemPrompt = readFileSync(articlePromptPath, 'utf-8');
    } catch {
      articleSystemPrompt = `You are an expert writer on Japanese traditional crafts. Generate a comprehensive article as a JSON object with fields: title (string), meta_description (string, under 160 chars), body_html (HTML string with h2/h3/p/ul tags, no absolute URLs in href), faq (array of {question, answer}), internal_links (array of {slug, anchor_text}). Use only relative URLs. Return ONLY valid JSON.`;
    }

    const claudeArticleResponse = await callClaude(articleSystemPrompt, inputStr);
    const parsed = parseJSON<ArticleClaudeResponse>(claudeArticleResponse);

    if (!parsed || !parsed.title || !parsed.body_html) {
      return NextResponse.json(
        { error: 'Failed to parse article from Claude response', raw: claudeArticleResponse.slice(0, 500) },
        { status: 422 }
      );
    }

    // Only reject Shopify-domain absolute URLs in internal links (Sources section may have external URLs)
    if (/href\s*=\s*["']https?:\/\/[^"']*myshopify\.com/i.test(parsed.body_html)) {
      return NextResponse.json(
        { error: 'Generated body_html contains absolute Shopify URLs in href attributes.' },
        { status: 400 }
      );
    }

    const articleUrl = `/blogs/crafts/${craftItem.slug}`;
    const jsonLdArray: Record<string, unknown>[] = [
      buildArticleJsonLd(craftItem, parsed.title, parsed.meta_description, articleUrl),
    ];

    if (parsed.faq && parsed.faq.length > 0) {
      jsonLdArray.push(buildFaqJsonLd(parsed.faq));
    }

    if (craftItem.pillar_id) {
      const pillarTarget = linkTargets.find(t => t.relation === 'pillar');
      if (pillarTarget) {
        jsonLdArray.push(
          buildBreadcrumbJsonLd(pillarTarget.slug, pillarTarget.name, craftItem.slug, craftItem.name_en)
        );
      }
    }

    const bodyHtmlWithJsonLd = embedJsonLd(parsed.body_html, jsonLdArray);

    const now = new Date().toISOString();
    const { data: upsertedArticle, error: upsertError } = await db
      .from('craft_articles')
      .upsert(
        {
          craft_item_id,
          title: parsed.title,
          body_html: bodyHtmlWithJsonLd,
          meta_description: parsed.meta_description,
          faq: parsed.faq ?? null,
          json_ld: jsonLdArray,
          internal_links: parsed.internal_links ?? null,
          generation_model: 'claude-sonnet-4-6',
          generation_input_hash: generationInputHash,
          status: 'article_review',
          updated_at: now,
        },
        { onConflict: 'craft_item_id' }
      )
      .select('id')
      .single();

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to save article', detail: upsertError.message },
        { status: 500 }
      );
    }

    await db
      .from('craft_items')
      .update({ status: 'article_review', updated_at: now })
      .eq('id', craft_item_id);

    return NextResponse.json({
      success: true,
      sources_fetched: sourcesFetched,
      facts_extracted: totalFactsExtracted,
      article_id: (upsertedArticle as { id: string }).id,
    });
  } catch (err) {
    console.error('autonomous-generate error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
