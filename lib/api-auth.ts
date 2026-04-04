import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { memberFromDb, companyFromDb } from './supabase/mappers';
import type { Company, WorkspaceMember } from './types';

export interface SessionData {
  member: WorkspaceMember;
  company: Company;
}

export async function getSession(): Promise<SessionData | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: memberRow } = await admin
    .from('workspace_members')
    .select('*')
    .eq('id', user.id)
    .eq('status', 'active')
    .single();
  if (!memberRow) return null;

  const { data: companyRow } = await admin
    .from('companies')
    .select('*')
    .eq('id', memberRow.company_id)
    .single();
  if (!companyRow) return null;

  return {
    member: memberFromDb(memberRow),
    company: companyFromDb(companyRow),
  };
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
