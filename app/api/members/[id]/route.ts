import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(memberFromDb(data));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const updates = await req.json();
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.password !== undefined) updateData.password = updates.password;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from('workspace_members')
    .update(updateData)
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(memberFromDb(data!));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  await supabase.from('workspace_members').delete().eq('id', params.id).eq('company_id', session.company.id);
  return NextResponse.json({ ok: true });
}
