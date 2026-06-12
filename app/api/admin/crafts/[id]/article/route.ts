export const maxDuration = 60;

import { getCraftItem, getCraftArticle, updateCraftArticle, saveCraftArticle } from '@/lib/crafts-supabase';
import { updateCraftItem } from '@/lib/crafts-supabase';
import type { CraftItemStatus } from '@/types/crafts';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getCraftItem(id);
  if (!item) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const article = await getCraftArticle(id);
  return Response.json({ item, article });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      body_html?: string;
      meta_description?: string;
      title?: string;
      status?: CraftItemStatus;
    };

    const item = await getCraftItem(id);
    if (!item) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const article = await getCraftArticle(id);

    const articleUpdate: Record<string, unknown> = {};
    if (body.body_html !== undefined) articleUpdate.body_html = body.body_html;
    if (body.meta_description !== undefined) articleUpdate.meta_description = body.meta_description;
    if (body.title !== undefined) articleUpdate.title = body.title;
    if (body.status !== undefined) articleUpdate.status = body.status;

    if (article) {
      await updateCraftArticle(article.id, articleUpdate);
    } else {
      await saveCraftArticle(id, articleUpdate);
    }

    if (body.status !== undefined) {
      await updateCraftItem(id, { status: body.status });
    }

    const updated = await getCraftArticle(id);
    return Response.json({ article: updated });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
