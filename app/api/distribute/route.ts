export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { callClaude, parseJSON, ClaudeOverloadedError } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';

interface DistributionContent {
  mjc_url: string;
  medium: {
    intro: string;
    canonical_note: string;
  };
  newsletter: {
    subjects: string[];
    intro: string;
    body: string;
  };
  notes: {
    fact: string;
    question: string;
    story: string;
  };
  schedule: {
    day0_label: string;
    day3_label: string;
    day7_label: string;
    day10_label: string;
    newsletter_label: string;
  };
}

function generateMjcUrl(titleEn: string): string {
  let slug = titleEn.toLowerCase();
  slug = slug.replace(/[:\?'"!&,]/g, '');
  slug = slug.replace(/\s+/g, '-').trim();
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  return `https://modernjapancrafts.com/blogs/journal/${slug}`;
}

export async function POST(req: NextRequest) {
  try {
    const { article_id, theme_title_en, content_en, product_name_en, product_name_ja } =
      await req.json() as {
        article_id: string;
        theme_title_en: string;
        content_en: string;
        product_name_en: string;
        product_name_ja: string;
      };

    if (!article_id || !theme_title_en || !content_en) {
      return NextResponse.json({ error: 'article_id, theme_title_en, content_en are required' }, { status: 400 });
    }

    const mjcUrl = generateMjcUrl(theme_title_en);

    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'distribute.md'), 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Prompt file not found' }, { status: 500 });
    }

    const userMessage = JSON.stringify({
      mjc_url: mjcUrl,
      theme_title: theme_title_en,
      product_name_en,
      product_name_ja,
      article_content: content_en.slice(0, 10000),
    });

    const raw = await callClaude(systemPrompt, userMessage);
    const parsed = parseJSON<DistributionContent>(raw);

    if (!parsed || !parsed.medium || !parsed.newsletter || !parsed.notes) {
      return NextResponse.json({ error: 'Failed to parse distribution content from Claude' }, { status: 422 });
    }

    // Save to DB
    const db = getSupabaseClient();
    await db
      .from('articles')
      .update({ distribution_content: parsed })
      .eq('id', article_id);

    return NextResponse.json({ success: true, distribution: parsed, mjc_url: mjcUrl });
  } catch (err) {
    if (err instanceof ClaudeOverloadedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('distribute error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
