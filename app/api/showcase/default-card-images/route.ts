import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { firstFunnelImage } from '@/lib/funnel-utils';
import type { FunnelPage } from '@/lib/funnel-types';

/**
 * Returns the default Showcase card-image (= first hero/intro image of each
 * content's funnel_doc) for a list of items. Used by the Übersicht editor to
 * preview "Aus Intro-Slide übernommen" thumbnails before the user uploads
 * their own card image.
 *
 * One round-trip per page load (vs. N round-trips if the editor fetched each
 * funnel_doc individually).
 */
const BodySchema = z.object({
  items: z.array(z.object({
    contentId: z.string().uuid(),
    contentType: z.enum(['quest', 'check', 'form']),
  })).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  const items = parsed.data.items;
  if (items.length === 0) return NextResponse.json({ defaults: {} });

  const admin = createAdminClient();
  const ids = items.map((i) => i.contentId);
  const { data, error } = await admin
    .from('funnel_docs')
    .select('content_id, content_type, pages')
    .in('content_id', ids);

  if (error) {
    console.error('[showcase/default-card-images] query failed', error);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  // Verify ownership: only return defaults for content owned by the caller's
  // company. We check via the content tables since funnel_docs has no
  // company_id column.
  const ownership = await Promise.all([
    admin.from('job_quests').select('id').eq('company_id', session.company.id).in('id', ids),
    admin.from('career_checks').select('id').eq('company_id', session.company.id).in('id', ids),
    admin.from('form_pages').select('id').eq('company_id', session.company.id).in('id', ids),
  ]);
  const ownedIds = new Set<string>();
  for (const r of ownership) {
    for (const row of r.data ?? []) ownedIds.add(row.id as string);
  }

  const defaults: Record<string, string> = {};
  for (const row of data ?? []) {
    const cid = row.content_id as string;
    if (!ownedIds.has(cid)) continue;
    const pages = (row.pages as FunnelPage[]) ?? [];
    const url = firstFunnelImage(pages);
    if (url) defaults[cid] = url;
  }

  return NextResponse.json({ defaults });
}
