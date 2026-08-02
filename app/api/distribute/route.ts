export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { callClaude, parseJSON, ClaudeOverloadedError } from '@/lib/claude';
import { getSupabaseClient } from '@/lib/supabase';
import { slugifyTitle } from '@/lib/slugify';
import type { DistributionContent } from '@/types';

// Claudeが実際に返すJSONの形（medium/notesはこのあとコードで最終形に組み立てる）
interface RawDistributionContent {
  mjc_url: string;
  medium: {
    intro_paragraphs: string[];
  };
  newsletter: {
    subject: string;
    subtitle: string;
    body: string;
  };
  notes: {
    fact: string;
    question: string;
    story: string;
  };
  schedule: DistributionContent['schedule'];
}

function generateMjcUrl(titleEn: string): string {
  return `https://modernjapancrafts.com/blogs/journal/${slugifyTitle(titleEn)}`;
}

function generateSubstackUrl(newsletterSubject: string): string {
  return `https://modernjapancrafts.substack.com/p/${slugifyTitle(newsletterSubject)}`;
}

// Medium用の記事全文HTMLを組み立てる: 元記事のh1はそのまま残し、
// 元記事の最初の<p>（定義文の書き出し）だけをClaudeがリライトした導入に差し替え、
// それ以降（h2セクション〜FAQ〜References）はそのまま流用する。
// 末尾にMJCへのcanonicalクレジットリンクを追加する。
function buildMediumFullHtml(contentEn: string, introParagraphs: string[], mjcUrl: string): string {
  const h1Match = contentEn.match(/<h1>[\s\S]*?<\/h1>/);
  let rest = contentEn;
  let h1 = '';
  if (h1Match) {
    h1 = h1Match[0];
    rest = contentEn.slice((h1Match.index ?? 0) + h1Match[0].length);
  }
  // 元記事冒頭の定義文<p>を除去（リライトした導入に差し替えるため）
  rest = rest.replace(/^\s*<p>[\s\S]*?<\/p>/, '');

  const introHtml = introParagraphs.map((p) => `<p>${p}</p>`).join('\n');
  const canonicalHtml = `<p><em>Originally published at <a href="${mjcUrl}">Modern Japan Crafts</a></em></p>`;

  return [h1, introHtml, rest.trim(), canonicalHtml].filter(Boolean).join('\n\n');
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
    const parsed = parseJSON<RawDistributionContent>(raw);

    if (!parsed || !parsed.medium || !parsed.newsletter || !parsed.notes) {
      return NextResponse.json({ error: 'Failed to parse distribution content from Claude' }, { status: 422 });
    }

    const substackUrl = generateSubstackUrl(parsed.newsletter.subject);

    const distribution: DistributionContent = {
      mjc_url: mjcUrl,
      substack_url: substackUrl,
      medium: {
        full_html: buildMediumFullHtml(content_en, parsed.medium.intro_paragraphs ?? [], mjcUrl),
      },
      newsletter: {
        subject: parsed.newsletter.subject,
        subtitle: parsed.newsletter.subtitle,
        body: parsed.newsletter.body.replace(/MJC_URL_HERE/g, mjcUrl),
      },
      notes: {
        fact: `${parsed.notes.fact}\n\n→ ${substackUrl}`,
        question: `${parsed.notes.question}\n\n→ ${substackUrl}`,
        story: parsed.notes.story,
      },
      schedule: parsed.schedule,
    };

    // Save to DB
    const db = getSupabaseClient();
    await db
      .from('articles')
      .update({ distribution_content: distribution })
      .eq('id', article_id);

    return NextResponse.json({ success: true, distribution, mjc_url: mjcUrl });
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
