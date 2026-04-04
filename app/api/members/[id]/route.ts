import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import type { WorkspaceRole } from '@/lib/types';

const PRIVILEGED_ROLES: WorkspaceRole[] = ['platform_admin', 'superadmin'];

function isPrivileged(role: WorkspaceRole) {
  return PRIVILEGED_ROLES.includes(role);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
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

  const { id } = await params;
  const updates = await req.json();
  const isSelf = id === session.member.id;
  const requesterRole = session.member.role as WorkspaceRole;

  // Changing another member's password requires superadmin+
  if (updates.password !== undefined && !isSelf && !isPrivileged(requesterRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Role changes require superadmin+, and nobody may elevate their own role
  if (updates.role !== undefined) {
    if (!isPrivileged(requesterRole)) {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(memberFromDb(data!));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const requesterRole = session.member.role as WorkspaceRole;

  // Only superadmin+ can delete members
  if (!isPrivileged(requesterRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Nobody can delete themselves
  if (id === session.member.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('workspace_members').delete().eq('id', id).eq('company_id', session.company.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
