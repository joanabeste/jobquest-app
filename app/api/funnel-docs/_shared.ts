import { createAdminClient } from '@/lib/supabase/admin';

export type FunnelContentType = 'quest' | 'check' | 'form';

export const CONTENT_TABLE: Record<FunnelContentType, string> = {
  quest: 'job_quests',
  check: 'career_checks',
  form: 'form_pages',
};

export async function ownsContent(
  companyId: string,
  contentId: string,
  contentType: FunnelContentType,
): Promise<boolean> {
  const table = CONTENT_TABLE[contentType];
  if (!table) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from(table)
    .select('id')
    .eq('id', contentId)
    .eq('company_id', companyId)
    .single();
  return !!data;
}
