import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession, unauthorized } from '@/lib/api-auth';
import { deleteCompanyCascade } from '@/lib/api/company-delete';
import { can } from '@/lib/types';
import type { WorkspaceRole } from '@/lib/types';

const IdSchema = z.string().uuid();

/**
 * POST /api/companies/[id]/delete-with-last-admin
 * Called when the last admin of a company is being removed.
 * Deletes the entire company and all its data.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: rawId } = await params;
  const idParse = IdSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const companyId = idParse.data;
  const requesterRole = session.member.role as WorkspaceRole;

  // Must be admin of this company or platform_admin
  if (session.company.id !== companyId && requesterRole !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!can(requesterRole, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify this company truly has only 1 active admin
  const admin = createAdminClient();
  const { count } = await admin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('role', 'admin')
    .eq('status', 'active');

  if ((count ?? 0) > 1) {
    return NextResponse.json({ error: 'Company still has multiple admins' }, { status: 400 });
  }

  const result = await deleteCompanyCascade(companyId);
  if (result.error) {
    console.error('[delete-with-last-admin] cascade failed', result.error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  // Sign out the current user (they just deleted their own company)
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
