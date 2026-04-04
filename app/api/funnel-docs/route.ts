import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { funnelDocFromDb, funnelDocToDb } from '@/lib/supabase/mappers';
import type { FunnelDoc } from '@/lib/funnel-types';
import { ownsContent, type FunnelContentType } from './_shared';

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

  const doc: FunnelDoc = await req.json();

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(funnelDocFromDb(data!));
}
