import { NextResponse } from 'next/server';
import { getSessionMemberId } from './session';
import { createAdminClient } from './supabase/admin';
import { memberFromDb, companyFromDb } from './supabase/mappers';
import type { Company, WorkspaceMember } from './types';

export interface SessionData {
  member: WorkspaceMember;
  company: Company;
}

export async function getSession(): Promise<SessionData | null> {
  const memberId = getSessionMemberId();
  if (!memberId) return null;

  const supabase = createAdminClient();
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('id', memberId)
    .single();
  if (!memberRow) return null;

  const { data: companyRow } = await supabase
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
