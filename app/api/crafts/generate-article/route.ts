import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { callClaude, parseJSON } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';
import { buildArticleJsonLd, buildFaqJsonLd, buildBreadcrumbJsonLd, embedJsonLd } from '@/lib/crafts-jsonld';
import type { CraftItem, FaqItem, InternalLink } from '@/types/crafts';

export const maxDuration = 60;

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

    // 2. Fetch approved/edited facts joined with source for publisher+url
    const { data: factsRaw, error: factsError } = await db
      .from('craft_facts')
      .select('fact_type, content, craft_sources(url, publisher)')
      .eq('craft_item_id', craft_item_id)
      .in('confidence', ['approved', 'edited']);

    if (factsError) {
      return NextResponse.json({ error: 'Failed to fetch facts', detail: factsError.message }, { status: 500 });
    }

    // Strip quote_basis — CRITICAL: never send raw source text to Claude
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
        // quote_basis intentionally omitted
        source: {
          publisher: src?.publisher ?? null,
          url: src?.url ?? '',
        },
      };
    });

    // 3. Fetch link targets
    let linkTargets: LinkTarget[] = [];

    if (craftItem.article_type === 'spoke' && craftItem.pillar_id) {
      // Sibling spokes sharing the same pillar
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

      // Also add pillar as a link target
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
      // Child spokes
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

    // 4. Build input JSON for Claude
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

    // 5. Compute generation_input_hash
    const inputStr = JSON.stringify(inputJson);
    const generationInputHash = createHash('sha256').update(inputStr).digest('hex');

    // 6. Select prompt based on article_type
    const promptFile =
      craftItem.article_type === 'pillar'
        ? 'generate_article_pillar.md'
        : 'generate_article_spoke.md';
    const promptPath = join(process.cwd(), 'prompts', 'crafts', promptFile);
    const systemPrompt = readFileSync(promptPath, 'utf-8');

    // 7. Call Claude
    const claudeResponse = await callClaude(systemPrompt, inputStr);

    // 8. Parse response
    const parsed = parseJSON<ArticleClaudeResponse>(claudeResponse);
    if (!parsed || !parsed.title || !parsed.body_html) {
      return NextResponse.json(
        { error: 'Failed to parse article from Claude response', raw: claudeResponse.slice(0, 500) },
        { status: 422 }
      );
    }

    // 9a. Check for absolute URLs in body_html (internal links must be relative)
    if (/href\s*=\s*["']https?:\/\//i.test(parsed.body_html)) {
      return NextResponse.json(
        { error: 'Generated body_html contains absolute URLs in href attributes. Internal links must use relative paths.' },
        { status: 400 }
      );
    }

    // 9b. Build JSON-LD array
    const articleUrl = `/blogs/crafts/${craftItem.slug}`;
    const jsonLdArray: Record<string, unknown>[] = [
      buildArticleJsonLd(craftItem, parsed.title, parsed.meta_description, articleUrl),
    ];

    if (parsed.faq && parsed.faq.length > 0) {
      jsonLdArray.push(buildFaqJsonLd(parsed.faq));
    }

    if (craftItem.pillar_id) {
      // Find pillar slug/name from linkTargets
      const pillarTarget = linkTargets.find(t => t.relation === 'pillar');
      if (pillarTarget) {
        jsonLdArray.push(
          buildBreadcrumbJsonLd(pillarTarget.slug, pillarTarget.name, craftItem.slug, craftItem.name_en)
        );
      }
    }

    // 9c. Embed JSON-LD into body_html
    const bodyHtmlWithJsonLd = embedJsonLd(parsed.body_html, jsonLdArray);

    // 10. UPSERT into craft_articles
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

    // 11. UPDATE craft_items.status = 'article_review'
    await db
      .from('craft_items')
      .update({ status: 'article_review', updated_at: now })
      .eq('id', craft_item_id);

    // 12. Return result
    return NextResponse.json({
      article_id: (upsertedArticle as { id: string }).id,
      title: parsed.title,
      status: 'article_review',
    });
  } catch (err) {
    console.error('generate-article error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
