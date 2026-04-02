import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { funnelDocFromDb, funnelDocToDb } from '@/lib/supabase/mappers';
import type { FunnelDoc } from '@/lib/funnel-types';

type ContentType = 'quest' | 'check' | 'form';

const CONTENT_TABLE: Record<ContentType, string> = {
  quest: 'job_quests',
  check: 'career_checks',
  form: 'form_pages',
};

async function ownsContent(companyId: string, contentId: string, contentType: ContentType): Promise<boolean> {
  const table = CONTENT_TABLE[contentType];
  if (!table) return false;
  const admin = createAdminClient();
  const { data } = await admin.from(table).select('id').eq('id', contentId).eq('company_id', companyId).single();
  return !!data;
}

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

  // Verify the referenced content belongs to this company
  if (!await ownsContent(session.company.id, data.content_id, data.content_type)) {
    return NextResponse.json(null);
  }

  return NextResponse.json(funnelDocFromDb(data));
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const doc: FunnelDoc = await req.json();

  // Verify the content being linked belongs to this company
  if (!await ownsContent(session.company.id, doc.contentId, doc.contentType as ContentType)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('funnel_docs')
    .upsert(funnelDocToDb(doc))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(funnelDocFromDb(data!));
}
