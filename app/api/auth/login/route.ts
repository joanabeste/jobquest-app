import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { memberFromDb, companyFromDb } from '@/lib/supabase/mappers';
import { withRoute } from '@/lib/api/with-route';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Generic message for any credential / member-state failure to prevent
// account enumeration via response-content or response-time differences.
const GENERIC_AUTH_ERROR = {
  error: 'E-Mail oder Passwort ist falsch.',
  code: 'invalid_credentials',
} as const;

export const POST = withRoute({
  body: LoginSchema,
  handler: async ({ body }) => {
    const { email, password } = body;

    // Env-var sanity check stays — misconfig is operator error, not user-facing.
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error('[login] Missing environment variables');
      return NextResponse.json(
        { error: 'Serverkonfiguration unvollständig.', code: 'env_missing' },
        { status: 500 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error('[login] signInWithPassword failed', {
        email,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
      });
      return NextResponse.json(GENERIC_AUTH_ERROR, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: memberRow, error: memberError } = await admin
      .from('workspace_members')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!memberRow) {
      console.error('[login] Member not found', {
        userId: data.user.id,
        memberError: memberError?.message,
      });
      await supabase.auth.signOut();
      // Generic error — do NOT reveal "account exists but no member row".
      return NextResponse.json(GENERIC_AUTH_ERROR, { status: 401 });
    }

    if (memberRow.status === 'pending') {
      await supabase.auth.signOut();
      // Distinct, non-enumerating message: it's safe because the user already
      // proved they own the credentials at this point.
      return NextResponse.json(
        {
          error:
            'Dein Konto wird noch geprüft. Du erhältst eine Benachrichtigung, sobald es freigeschaltet ist.',
          code: 'account_pending',
        },
        { status: 403 },
      );
    }

    const { data: companyRow, error: companyError } = await admin
      .from('companies')
      .select('*')
      .eq('id', memberRow.company_id)
      .single();

    if (!companyRow) {
      console.error('[login] Company not found', {
        companyId: memberRow.company_id,
        companyError: companyError?.message,
      });
      await supabase.auth.signOut();
      return NextResponse.json(GENERIC_AUTH_ERROR, { status: 401 });
    }

    return NextResponse.json({
      member: memberFromDb(memberRow),
      company: companyFromDb(companyRow),
    });
  },
});
