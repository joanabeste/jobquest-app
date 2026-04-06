import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort erforderlich', code: 'missing_fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT_SET';
      console.error('[login] signInWithPassword failed', {
        email,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        supabaseProject: supabaseUrl.replace('https://', '').split('.')[0],
      });

      // Distinguish between wrong credentials and other errors
      const isAuthError = error?.status === 400 || error?.message?.toLowerCase().includes('invalid');
      return NextResponse.json(
        {
          error: isAuthError
            ? 'E-Mail oder Passwort ist falsch.'
            : `Anmeldung fehlgeschlagen: ${error?.message ?? 'Unbekannter Fehler'}`,
          code: isAuthError ? 'invalid_credentials' : 'auth_error',
          // Include Supabase error for debugging (remove after fixing)
          debug: { supabaseError: error?.message, supabaseCode: error?.code },
        },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const { data: memberRow, error: memberError } = await admin
      .from('workspace_members')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!memberRow) {
      console.error('[login] Member not found in DB', { userId: data.user.id, email, memberError: memberError?.message });
      return NextResponse.json(
        { error: 'Kein Workspace-Account gefunden. Bitte wende dich an deinen Administrator.', code: 'member_not_found' },
        { status: 404 },
      );
    }

    const { data: companyRow, error: companyError } = await admin
      .from('companies')
      .select('*')
      .eq('id', memberRow.company_id)
      .single();

    if (!companyRow) {
      console.error('[login] Company not found', { companyId: memberRow.company_id, companyError: companyError?.message });
      return NextResponse.json(
        { error: 'Kein Unternehmen gefunden. Bitte wende dich an den Support.', code: 'company_not_found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      member: memberFromDb(memberRow),
      company: companyFromDb(companyRow),
    });
  } catch (err: unknown) {
    console.error('[login] Unexpected error', err);
    return NextResponse.json({ error: 'Interner Serverfehler', code: 'server_error' }, { status: 500 });
  }
}
