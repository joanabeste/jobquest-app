import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import { can } from '@/lib/types';

// Same allowlist as members/[id] PUT — `platform_admin` is intentionally
// excluded so this endpoint cannot be used to escalate privileges.
const AssignableRoleSchema = z.enum(['admin', 'editor', 'viewer']);

const CreateMemberSchema = z.object({
  // Optional id is only honored if it matches a Supabase auth user already
  // bound to this company; otherwise we ignore it. Validated as UUID to
  // reject path-traversal-style strings.
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  role: AssignableRoleSchema,
  invitedBy: z.string().uuid().optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('company_id', session.company.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[members GET] list failed', error);
    return NextResponse.json({ error: 'list_failed' }, { status: 500 });
  }
  return NextResponse.json(data!.map(memberFromDb));
}

// Used as apiUpsert fallback when a member record is missing from the DB.
// Auth user must already exist (created via /api/members/invite).
//
// SECURITY: previously this endpoint accepted arbitrary `role` from the
// client and any session user could call it, which made it possible to grant
// `platform_admin` to any newly inserted row. The route now requires
// `manage_members` and rejects any role outside the assignable allowlist.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!can(session.member.role, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = CreateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  const { id, name, email, role, invitedBy, status } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workspace_members')
    .insert({
      ...(id ? { id } : {}),
      company_id: session.company.id,
      name,
      email: email.toLowerCase(),
      role,
      invited_by: invitedBy ?? null,
      status: status ?? 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[members POST] insert failed', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
  return NextResponse.json(memberFromDb(data!));
}
