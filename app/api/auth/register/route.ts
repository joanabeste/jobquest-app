import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionResponse } from '@/lib/session';
import { companyToDb } from '@/lib/supabase/mappers';
import type { Company, WorkspaceMember } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, industry, location, logo, contactName, contactEmail, password, privacyUrl, imprintUrl, corporateDesign } = body;

    if (!name || !contactEmail || !password) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('contact_email', contactEmail)
      .single();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const companyId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();

    const company: Company = {
      id: companyId,
      name,
      industry: industry || '',
      location: location || '',
      logo,
      privacyUrl,
      imprintUrl,
      contactName: contactName || '',
      contactEmail,
      password,
      createdAt: now,
      corporateDesign,
    };

    const { error: companyError } = await supabase
      .from('companies')
      .insert(companyToDb(company));
    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 });
    }

    const member: WorkspaceMember = {
      id: memberId,
      companyId,
      name: contactName || name,
      email: contactEmail,
      password,
      role: 'superadmin',
      createdAt: now,
      status: 'active',
    };

    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        id: memberId,
        company_id: companyId,
        name: member.name,
        email: member.email,
        password: member.password,
        role: 'superadmin',
        status: 'active',
        created_at: now,
      });
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return createSessionResponse(memberId, { member, company });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
