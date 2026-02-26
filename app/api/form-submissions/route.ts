import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { formSubmissionFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const formId = req.nextUrl.searchParams.get('formId');

  let query = supabase.from('form_submissions').select('*').eq('company_id', session.company.id);
  if (formId) query = query.eq('form_page_id', formId);
  query = query.order('submitted_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(formSubmissionFromDb));
}
