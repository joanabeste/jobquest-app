import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { companyId, devPassword } = await req.json();
  if (!process.env.DEV_PASSWORD || devPassword !== process.env.DEV_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check if platform_admin already exists for this company
  const { data: existing } = await admin
    .from('workspace_members')
    .select('*')
    .eq('company_id', companyId)
    .eq('role', 'platform_admin')
    .single();

  let memberId: string;
  const devEmail = `dev-${companyId.slice(0, 8)}@jobquest.dev`;

  if (existing) {
    memberId = existing.id;
  } else {
    // Create auth user for the dev account
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: devEmail,
      password: process.env.DEV_PASSWORD,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Auth creation failed' }, { status: 500 });
    }
    memberId = authData.user.id;

    await admin.from('workspace_members').insert({
      id: memberId,
      company_id: companyId,
      name: 'Developer',
      email: devEmail,
      role: 'platform_admin',
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }

  const { data: memberRow } = await admin
    .from('workspace_members')
    .select('*')
    .eq('id', memberId)
    .single();

  const { data: companyRow } = await admin
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (!memberRow || !companyRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Sign in to set session cookies
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithPassword({ email: devEmail, password: process.env.DEV_PASSWORD });

  return NextResponse.json({
    member: memberFromDb(memberRow),
    company: companyFromDb(companyRow),
  });
}
