import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { analyticsFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const questId = req.nextUrl.searchParams.get('questId');
  if (!questId) return NextResponse.json({ error: 'questId required' }, { status: 400 });

  const supabase = createAdminClient();

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
