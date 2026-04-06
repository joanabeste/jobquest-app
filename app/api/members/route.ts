import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';

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

// Used as apiUpsert fallback when a member record is missing from the DB.
// Auth user must already exist (created via /api/members/invite).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let body: { id?: string; name?: string; email?: string; role?: string; invitedBy?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  const { id, name, email, role, invitedBy, status } = body;
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email and role are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workspace_members')
    .insert({
      ...(id ? { id } : {}),
      company_id: session.company.id,
      name,
      email,
      role,
      invited_by: invitedBy ?? null,
      status: status ?? 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(memberFromDb(data!));
}
