import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { setImpersonation, clearImpersonation } from '@/lib/impersonation';

const ImpersonateSchema = z.object({
  // Strict UUID — `.eq('id', companyId)` is safe regardless, but the explicit
  // check rejects garbage early and prevents probing with non-UUID strings.
  companyId: z.string().uuid(),
});

/** POST /api/admin/impersonate — start impersonating a company */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.member.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ImpersonateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'companyId must be a valid UUID' }, { status: 400 });
  }
  const { companyId } = parsed.data;

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
