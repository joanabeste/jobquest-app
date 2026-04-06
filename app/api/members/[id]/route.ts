import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import { can } from '@/lib/types';
import type { WorkspaceRole } from '@/lib/types';
import { parseBody } from '@/lib/api/helpers';

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
  const parsed = await parseBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data;
  const isSelf = id === session.member.id;
  const requesterRole = session.member.role as WorkspaceRole;

  // Changing another member's password requires manage_members
  if (updates.password !== undefined && !isSelf && !can(requesterRole, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Role changes require manage_members, and nobody may change their own role
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
    await supabase.auth.admin.updateUserById(id, { password: updates.password as string });
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
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(memberFromDb(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
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
