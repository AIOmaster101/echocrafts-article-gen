export const maxDuration = 60;

import { readFileSync } from 'fs';
import { join } from 'path';
import { getCraftItem, getCraftFacts, saveCraftArticle, updateCraftItem } from '@/lib/crafts-supabase';
import { callClaude, parseJSON } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';
import type { CraftArticle, InternalLink, FaqItem } from '@/types/crafts';

interface GeneratedArticle {
  title: string;
  meta_description: string;
  body_html: string;
  faq: FaqItem[];
  internal_links: InternalLink[];
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await getCraftItem(id);
    if (!item) {
      return Response.json({ error: 'Craft item not found' }, { status: 404 });
    }

    // Fetch approved facts with source info
    const db = getSupabaseClient();
    const { data: factsRaw, error: factsError } = await db
      .from('craft_facts')
      .select('*, source:craft_sources(publisher, url, tier)')
      .eq('craft_item_id', id)
      .in('confidence', ['approved', 'edited']);

    if (factsError) {
      return Response.json({ error: 'Failed to fetch facts', detail: factsError.message }, { status: 500 });
    }

    const facts = factsRaw ?? [];

    // Fetch pillar links for internal link targets
    let linkTargets: { slug: string; name_en: string }[] = [];
    if (item.article_type === 'spoke' && item.pillar_id) {
      const { data: pillarLinks } = await db
        .from('craft_items')
        .select('slug, name_en')
        .eq('id', item.pillar_id)
        .limit(1);
      if (pillarLinks && pillarLinks.length > 0) {
        linkTargets = pillarLinks;
      }
    } else {
      // For pillar articles, get related spokes
      const { data: spokes } = await db
        .from('craft_items')
        .select('slug, name_en')
        .eq('pillar_id', id)
        .limit(5);
      if (spokes) linkTargets = spokes;
    }

    const promptPath = join(process.cwd(), 'prompts', 'crafts', 'generate_article_spoke.md');
    const systemPrompt = readFileSync(promptPath, 'utf-8');

    const userInput = JSON.stringify({
      craft_item: {
        name_en: item.name_en,
        name_ja: item.name_ja,
        category: item.category,
        region_en: item.region_en,
        region_ja: item.region_ja,
        meti_designated: item.meti_designated,
        meti_designation_year: item.meti_designation_year,
        article_type: item.article_type,
        slug: item.slug,
      },
      facts: facts.map((f) => ({
        fact_type: f.fact_type,
        content: f.content,
        source: f.source,
      })),
      link_targets: linkTargets.map((t) => ({
        slug: t.slug,
        name_en: t.name_en,
      })),
    });

    // Update status to 'generating'
    await updateCraftItem(id, { status: 'generating' });

    const claudeResponse = await callClaude(systemPrompt, userInput);
    const parsed = parseJSON<GeneratedArticle>(claudeResponse);

    if (!parsed || !parsed.body_html) {
      await updateCraftItem(id, { status: 'facts_review' });
      return Response.json(
        { error: 'Failed to parse article from Claude', raw: claudeResponse.slice(0, 500) },
        { status: 422 }
      );
    }

    const articleData: Partial<CraftArticle> = {
      title: parsed.title ?? null,
      body_html: parsed.body_html,
      meta_description: parsed.meta_description ?? null,
      faq: parsed.faq ?? null,
      internal_links: parsed.internal_links ?? null,
      generation_model: 'claude-sonnet-4-6',
      status: 'article_review',
      shopify_blog_handle: 'crafts',
    };

    const article = await saveCraftArticle(id, articleData);
    await updateCraftItem(id, { status: 'article_review' });

    return Response.json({ success: true, article_id: article.id });
  } catch (e) {
    console.error('generate article error:', e);
    return Response.json(
      { error: 'Internal server error', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
