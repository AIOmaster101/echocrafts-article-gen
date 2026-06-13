import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { CraftItem } from '@/types/crafts';

export const maxDuration = 30;

interface UnsplashPhoto {
  id: string;
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
  alt_description: string | null;
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[];
  total: number;
}

export async function POST(req: NextRequest) {
  try {
    const { craft_item_id } = (await req.json()) as { craft_item_id: string };

    if (!craft_item_id) {
      return NextResponse.json({ error: 'craft_item_id is required' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY is not configured' }, { status: 500 });
    }

    const db = getSupabaseClient();

    const { data: item, error: itemError } = await db
      .from('craft_items')
      .select('name_en, name_ja, category')
      .eq('id', craft_item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Craft item not found' }, { status: 404 });
    }

    const craftItem = item as Pick<CraftItem, 'name_en' | 'name_ja' | 'category'>;

    // Build search queries in priority order — try more specific first
    const queries = [
      `${craftItem.name_en} Japanese traditional craft`,
      `${craftItem.name_ja} 工芸`,
      `Japanese traditional ${craftItem.category}`,
    ];

    let photo: UnsplashPhoto | null = null;

    for (const query of queries) {
      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '5');
      url.searchParams.set('orientation', 'landscape');
      url.searchParams.set('content_filter', 'high');

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`Unsplash search failed for query "${query}": ${res.status}`);
        continue;
      }

      const data = (await res.json()) as UnsplashSearchResult;
      if (data.results.length > 0) {
        photo = data.results[0];
        break;
      }
    }

    if (!photo) {
      return NextResponse.json(
        { error: '画像が見つかりませんでした。検索キーワードを変えて再試行してください。' },
        { status: 404 }
      );
    }

    const imageUrl = photo.urls.regular;
    const credit = `Photo by ${photo.user.name} on Unsplash`;

    const { error: updateError } = await db
      .from('craft_items')
      .update({
        cover_image_url: imageUrl,
        cover_image_credit: credit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', craft_item_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save image', detail: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cover_image_url: imageUrl,
      cover_image_credit: credit,
      alt: photo.alt_description ?? craftItem.name_en,
    });
  } catch (err) {
    console.error('fetch-cover-image error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
