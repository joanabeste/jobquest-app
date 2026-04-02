import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: memberRow } = await admin
      .from('workspace_members')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!memberRow) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: companyRow } = await admin
      .from('companies')
      .select('*')
      .eq('id', memberRow.company_id)
      .single();

    if (!companyRow) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      member: memberFromDb(memberRow),
      company: companyFromDb(companyRow),
    });
  } catch (err: unknown) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
