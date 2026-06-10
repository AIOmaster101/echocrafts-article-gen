export const maxDuration = 60;

import { getCraftFacts, updateFactConfidence } from '@/lib/crafts-supabase';
import type { FactType } from '@/types/crafts';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const facts = await getCraftFacts(id);

    // Group by fact_type
    const grouped: Partial<Record<FactType, typeof facts>> = {};
    for (const fact of facts) {
      if (!grouped[fact.fact_type]) grouped[fact.fact_type] = [];
      grouped[fact.fact_type]!.push(fact);
    }

    return Response.json({ facts, grouped });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // ensures route param is consumed
  try {
    const body = await req.json();
    const { fact_id, action, claim, year, note } = body as {
      fact_id: string;
      action: 'approve' | 'reject' | 'edit';
      claim?: string;
      year?: number | null;
      note?: string;
    };

    if (!fact_id || !action) {
      return Response.json({ error: 'fact_id と action が必要です' }, { status: 400 });
    }

    if (action === 'approve') {
      await updateFactConfidence(fact_id, 'approved', undefined, undefined, note);
    } else if (action === 'reject') {
      await updateFactConfidence(fact_id, 'rejected', undefined, undefined, note);
    } else if (action === 'edit') {
      await updateFactConfidence(fact_id, 'edited', claim, year, note);
    } else {
      return Response.json({ error: '無効なアクションです' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
