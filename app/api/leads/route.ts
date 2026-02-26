import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { leadFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const questId = req.nextUrl.searchParams.get('questId');

  let query = supabase.from('leads').select('*').eq('company_id', session.company.id);
  if (questId) query = query.eq('job_quest_id', questId);
  query = query.order('submitted_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(leadFromDb));
}
