import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionResponse } from '@/lib/session';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';
import { DEV_PASSWORD } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { companyId, devPassword } = await req.json();
  if (devPassword !== DEV_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Check if platform_admin already exists for this company
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('company_id', companyId)
    .eq('role', 'platform_admin')
    .single();

  let memberId: string;
  if (existing) {
    memberId = existing.id;
  } else {
    memberId = crypto.randomUUID();
    await supabase.from('workspace_members').insert({
      id: memberId,
      company_id: companyId,
      name: 'Developer',
      email: `dev-${memberId.slice(0, 8)}@jobquest.dev`,
      password: DEV_PASSWORD,
      role: 'platform_admin',
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }

  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('id', memberId)
    .single();

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (!memberRow || !companyRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return createSessionResponse(memberId, {
    member: memberFromDb(memberRow),
    company: companyFromDb(companyRow),
  });
}
