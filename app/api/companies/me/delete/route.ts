import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { clearSessionResponse } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const companyId = session.company.id;

  // Delete funnel docs (no direct cascade from companies)
  const { data: quests } = await supabase.from('job_quests').select('id').eq('company_id', companyId);
  const { data: checks } = await supabase.from('career_checks').select('id').eq('company_id', companyId);
  const { data: forms } = await supabase.from('form_pages').select('id').eq('company_id', companyId);
  const contentIds = [...(quests ?? []), ...(checks ?? []), ...(forms ?? [])].map(r => r.id);

  if (contentIds.length > 0) {
    await supabase.from('funnel_docs').delete().in('content_id', contentIds);
  }

  // Delete company (cascades to all other tables)
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return clearSessionResponse({ ok: true });
}
