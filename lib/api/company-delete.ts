import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Deletes a company and all associated data (quests, checks, forms, funnel docs, members, auth users).
 * The company row deletion cascades to most child tables; funnel_docs must be deleted explicitly.
 */
export async function deleteCompanyCascade(companyId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();

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
    await Promise.allSettled(members.map((m) => admin.auth.admin.deleteUser(m.id)));
  }

  // Delete company (cascades to all other tables)
  const { error } = await admin.from('companies').delete().eq('id', companyId);
  if (error) return { error: error.message };

  return {};
}
