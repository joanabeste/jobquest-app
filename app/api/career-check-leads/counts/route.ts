import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('career_check_leads')
    .select('career_check_id')
    .eq('company_id', session.company.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { career_check_id: string | null }).career_check_id;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return NextResponse.json(counts);
}
