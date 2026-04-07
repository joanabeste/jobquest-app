import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { analyticsFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const questId = req.nextUrl.searchParams.get('questId');
  const supabase = createAdminClient();

  if (questId) {
    // Verify quest belongs to company
    const { data: quest } = await supabase
      .from('job_quests')
      .select('id')
      .eq('id', questId)
      .eq('company_id', session.company.id)
      .single();
    if (!quest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('job_quest_id', questId)
      .order('timestamp', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data!.map(analyticsFromDb));
  }

  // Company-wide: all events for all quests of this company
  const { data: quests, error: questsErr } = await supabase
    .from('job_quests')
    .select('id')
    .eq('company_id', session.company.id);
  if (questsErr) return NextResponse.json({ error: questsErr.message }, { status: 500 });
  const ids = (quests ?? []).map((q) => q.id);
  if (ids.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .in('job_quest_id', ids)
    .order('timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(analyticsFromDb));
}
