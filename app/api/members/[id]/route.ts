import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import { can } from '@/lib/types';
import type { WorkspaceRole } from '@/lib/types';

// Strict allowlist of roles that may be assigned via this endpoint.
// `platform_admin` is intentionally NOT in the list — it must never be
// granted from a workspace-scoped API, otherwise any workspace admin could
// escalate to platform admin by sending `{ role: 'platform_admin' }`.
const AssignableRoleSchema = z.enum(['admin', 'editor', 'viewer']);

const MemberStatusSchema = z.enum(['active', 'pending', 'disabled']);

const UpdateMemberSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: AssignableRoleSchema.optional(),
  status: MemberStatusSchema.optional(),
  password: z.string().min(8).max(200).optional(),
});

// UUID format from Supabase auth.users.id; rejects garbage path params.
const IdSchema = z.string().uuid();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: rawId } = await params;
  const idParse = IdSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const id = idParse.data;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('id', id)
    .eq('company_id', session.company.id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(memberFromDb(data));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: rawId } = await params;
  const idParse = IdSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const id = idParse.data;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = UpdateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  const updates = parsed.data;

  const isSelf = id === session.member.id;
  const requesterRole = session.member.role as WorkspaceRole;

  // Changing another member's password requires manage_members
  if (updates.password !== undefined && !isSelf && !can(requesterRole, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Role changes require manage_members, and nobody may change their own role.
  // The schema already restricts assignable roles to a non-platform-admin
  // allowlist, so privilege escalation via `role: 'platform_admin'` is blocked
  // at validation time.
  if (updates.role !== undefined) {
    if (!can(requesterRole, 'manage_members')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isSelf) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
    }
  }

  const supabase = createAdminClient();

  // Password changes go through Supabase Auth, not the DB
  if (updates.password !== undefined) {
    await supabase.auth.admin.updateUserById(id, { password: updates.password });
  }

  // Email changes must propagate to Supabase Auth as well, otherwise
  // workspace_members.email and auth.users.email diverge silently.
  if (updates.email !== undefined) {
    await supabase.auth.admin.updateUserById(id, { email: updates.email });
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from('workspace_members')
    .update(updateData)
    .eq('id', id)
    .eq('company_id', session.company.id)
    .select()
    .single();

  if (error) {
    console.error('[members PUT] update failed', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(memberFromDb(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: rawId } = await params;
  const idParse = IdSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const id = idParse.data;
  const requesterRole = session.member.role as WorkspaceRole;

  // Only users with manage_members can delete members
  if (!can(requesterRole, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Nobody can delete themselves via this endpoint (use account deletion instead)
  if (id === session.member.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Check if target is the last admin of the company
  const { data: target } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', id)
    .eq('company_id', session.company.id)
    .single();

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (target.role === 'admin') {
    const { count } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', session.company.id)
      .eq('role', 'admin');

    if ((count ?? 0) <= 1) {
      // Check if there are other team members who could become admin
      const { count: totalMembers } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', session.company.id)
        .neq('id', id);

      return NextResponse.json(
        {
          error: 'last_admin',
          hasOtherMembers: (totalMembers ?? 0) > 0,
          message: (totalMembers ?? 0) > 0
            ? 'Dies ist der letzte Admin. Übertrage zuerst die Admin-Rolle an ein anderes Teammitglied.'
            : 'Dies ist der letzte Admin. Das Entfernen löscht das gesamte Unternehmen und alle Daten.',
        },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase.from('workspace_members').delete().eq('id', id).eq('company_id', session.company.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
