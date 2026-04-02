import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { companyToDb } from '@/lib/supabase/mappers';
import type { Company, WorkspaceMember } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, industry, location, logo, contactName, contactEmail, password, privacyUrl, imprintUrl, corporateDesign } = body;

    if (!name || !contactEmail || !password) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[register] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 });
    }

    const admin = createAdminClient();

    // Check if email already exists in companies
    const { data: existing } = await admin
      .from('companies')
      .select('id')
      .eq('contact_email', contactEmail)
      .single();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: contactEmail,
      password,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Auth user creation failed';
      console.error('[register] auth createUser', msg);
      // Supabase returns this when the email is already in auth.users
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const userId = authData.user.id;
    const companyId = crypto.randomUUID();
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
      createdAt: now,
      corporateDesign,
    };

    const { error: companyError } = await admin
      .from('companies')
      .insert(companyToDb(company));
    if (companyError) {
      await admin.auth.admin.deleteUser(userId);
      console.error('[register] company insert', companyError);
      return NextResponse.json({ error: `company_insert: ${companyError.message}` }, { status: 500 });
    }

    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({
        id: userId,
        company_id: companyId,
        name: contactName || name,
        email: contactEmail,
        role: 'superadmin',
        status: 'active',
        created_at: now,
      });
    if (memberError) {
      await admin.auth.admin.deleteUser(userId);
      await admin.from('companies').delete().eq('id', companyId);
      console.error('[register] member insert', memberError);
      return NextResponse.json({ error: `member_insert: ${memberError.message}` }, { status: 500 });
    }

    // Sign in to set session cookies
    const supabase = createServerSupabaseClient();
    await supabase.auth.signInWithPassword({ email: contactEmail, password });

    const member: WorkspaceMember = {
      id: userId,
      companyId,
      name: contactName || name,
      email: contactEmail,
      role: 'superadmin',
      status: 'active',
      createdAt: now,
    };

    return NextResponse.json({ member, company });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[register] unhandled exception:', msg);
    return NextResponse.json({ error: `Serverfehler: ${msg}` }, { status: 500 });
  }
}
