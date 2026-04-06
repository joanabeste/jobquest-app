import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { DEFAULT_PLAN } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const admin = createAdminClient();
  const companyId = session.company.id;

  const [quests, checks, forms] = await Promise.all([
    admin.from('job_quests').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('career_checks').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('form_pages').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  return NextResponse.json({
    plan: session.company.plan ?? DEFAULT_PLAN,
    usage: {
      jobQuests: quests.count ?? 0,
      berufschecks: checks.count ?? 0,
      formulare: forms.count ?? 0,
    },
  });
}
