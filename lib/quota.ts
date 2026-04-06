import { createAdminClient } from './supabase/admin';
import type { CompanyPlan, ContentType } from './types';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  max: number;
}

const TABLE_MAP: Record<ContentType, string> = {
  jobquests: 'job_quests',
  berufschecks: 'career_checks',
  formulare: 'form_pages',
};

const MAX_MAP: Record<ContentType, keyof CompanyPlan> = {
  jobquests: 'maxJobQuests',
  berufschecks: 'maxBerufschecks',
  formulare: 'maxFormulare',
};

export async function checkQuota(
  companyId: string,
  contentType: ContentType,
  plan: CompanyPlan,
): Promise<QuotaCheckResult> {
  const max = plan[MAX_MAP[contentType]];
  if (max === 0) return { allowed: false, current: 0, max: 0 };

  const admin = createAdminClient();
  const { count } = await admin
    .from(TABLE_MAP[contentType])
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const current = count ?? 0;
  return { allowed: current < max, current, max };
}
