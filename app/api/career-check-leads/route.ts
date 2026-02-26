import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { careerCheckLeadFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const checkId = req.nextUrl.searchParams.get('checkId');

  let query = supabase.from('career_check_leads').select('*').eq('company_id', session.company.id);
  if (checkId) query = query.eq('career_check_id', checkId);
  query = query.order('submitted_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(careerCheckLeadFromDb));
}
