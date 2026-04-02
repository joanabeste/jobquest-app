import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession, unauthorized } from '@/lib/api-auth';

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  const admin = createAdminClient();
  const companyId = session.company.id;

  // Delete funnel docs (no direct cascade from companies)
  const { data: quests } = await admin.from('job_quests').select('id').eq('company_id', companyId);
  const { data: checks } = await admin.from('career_checks').select('id').eq('company_id', companyId);
  const { data: forms } = await admin.from('form_pages').select('id').eq('company_id', companyId);
  const contentIds = [...(quests ?? []), ...(checks ?? []), ...(forms ?? [])].map(r => r.id);

  if (contentIds.length > 0) {
    await admin.from('funnel_docs').delete().in('content_id', contentIds);
  }

  // Delete all auth users for this company's members
  const { data: members } = await admin
    .from('workspace_members')
    .select('id')
    .eq('company_id', companyId);
  if (members) {
    await Promise.all(members.map((m) => admin.auth.admin.deleteUser(m.id)));
  }

  // Delete company (cascades to all other tables)
  const { error } = await admin.from('companies').delete().eq('id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sign out
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
