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

/** Ownership-Check für ein Funnel-Doc: lädt das Doc und leitet auf ownsContent weiter. */
export async function ownsFunnelDoc(
  companyId: string,
  funnelDocId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('funnel_docs')
    .select('content_id, content_type')
    .eq('id', funnelDocId)
    .single();
  if (!data) return false;
  return ownsContent(companyId, data.content_id as string, data.content_type as FunnelContentType);
}
