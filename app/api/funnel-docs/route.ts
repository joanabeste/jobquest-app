import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { funnelDocFromDb, funnelDocToDb } from '@/lib/supabase/mappers';
import type { FunnelDoc } from '@/lib/funnel-types';
import { ownsContent, type FunnelContentType } from './_shared';

// `contentType` is the most security-relevant field — it routes the
// ownership check via `ownsContent`. Any value outside the closed set must
// be rejected before the DB call. Pages/emailConfig are editor JSON.
const FunnelContentTypeSchema = z.enum(['quest', 'career_check', 'form_page']);

const FunnelDocSchema = z.object({
  id: z.string().uuid().optional(),
  contentId: z.string().min(1).max(200),
  contentType: FunnelContentTypeSchema,
  pages: z.array(z.unknown()).optional().default([]),
  emailConfig: z.unknown().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const contentId = req.nextUrl.searchParams.get('contentId');
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('funnel_docs')
    .select('*')
    .eq('content_id', contentId)
    .single();

  if (!data) return NextResponse.json(null);

  if (!await ownsContent(session.company.id, data.content_id, data.content_type)) {
    return NextResponse.json(null);
  }

  return NextResponse.json(funnelDocFromDb(data));
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = FunnelDocSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  const doc = parsed.data as unknown as FunnelDoc;

  if (!await ownsContent(session.company.id, doc.contentId, doc.contentType as FunnelContentType)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const dbRow = { ...funnelDocToDb(doc), updated_at: new Date().toISOString() };
  const { data, error } = await admin
    .from('funnel_docs')
    .upsert(dbRow)
    .select()
    .single();

  if (error) {
    console.error('[PUT /api/funnel-docs]', error.message, error.details, error.hint);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(funnelDocFromDb(data));
}
