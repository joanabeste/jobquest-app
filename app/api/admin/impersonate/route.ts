import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { setImpersonation, clearImpersonation } from '@/lib/impersonation';

/** POST /api/admin/impersonate — start impersonating a company */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.member.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = await req.json();
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: company } = await admin
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  await setImpersonation({ companyId: company.id, companyName: company.name });
  return NextResponse.json({ ok: true, companyName: company.name });
}

/** DELETE /api/admin/impersonate — stop impersonating */
export async function DELETE() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.member.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await clearImpersonation();
  return NextResponse.json({ ok: true });
}
