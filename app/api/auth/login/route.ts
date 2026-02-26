import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionResponse } from '@/lib/session';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Try member login (primary)
    const { data: memberRow } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (memberRow && memberRow.password === password) {
      const member = memberFromDb(memberRow);
      const { data: companyRow } = await supabase
        .from('companies')
        .select('*')
        .eq('id', memberRow.company_id)
        .single();
      if (!companyRow) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      return createSessionResponse(member.id, {
        member,
        company: companyFromDb(companyRow),
      });
    }

    // Fallback: legacy company login
    const { data: companyRow } = await supabase
      .from('companies')
      .select('*')
      .eq('contact_email', email)
      .single();

    if (companyRow && companyRow.password === password) {
      const company = companyFromDb(companyRow);

      // Ensure superadmin member exists
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('company_id', companyRow.id)
        .eq('role', 'superadmin')
        .eq('status', 'active')
        .single();

      let memberId: string;
      if (existingMember) {
        memberId = existingMember.id;
      } else {
        const newId = crypto.randomUUID();
        await supabase.from('workspace_members').insert({
          id: newId,
          company_id: companyRow.id,
          name: companyRow.contact_name,
          email: companyRow.contact_email,
          password: companyRow.password,
          role: 'superadmin',
          status: 'active',
          created_at: companyRow.created_at,
        });
        memberId = newId;
      }

      const { data: memberRow2 } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('id', memberId)
        .single();

      return createSessionResponse(memberId, {
        member: memberRow2 ? memberFromDb(memberRow2) : null,
        company,
      });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
