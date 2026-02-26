import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import type { WorkspaceMember } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('company_id', session.company.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(memberFromDb));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const member: WorkspaceMember = await req.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('workspace_members')
    .insert({
      id: member.id,
      company_id: session.company.id,
      name: member.name,
      email: member.email,
      password: member.password,
      role: member.role,
      invited_by: member.invitedBy ?? null,
      status: member.status || 'active',
      created_at: member.createdAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(memberFromDb(data!));
}
