import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { funnelDocFromDb, funnelDocToDb } from '@/lib/supabase/mappers';
import type { FunnelDoc } from '@/lib/funnel-types';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const contentId = req.nextUrl.searchParams.get('contentId');
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('funnel_docs')
    .select('*')
    .eq('content_id', contentId)
    .single();

  if (!data) return NextResponse.json(null);
  return NextResponse.json(funnelDocFromDb(data));
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const doc: FunnelDoc = await req.json();
  const supabase = createAdminClient();
  const dbData = funnelDocToDb(doc);

  const { data, error } = await supabase
    .from('funnel_docs')
    .upsert(dbData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(funnelDocFromDb(data!));
}
