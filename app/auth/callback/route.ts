import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Supabase PKCE auth callback.
 * The reset-password email links to /auth/callback?code=xxx&next=/reset-password
 * This route exchanges the code for a session (sets cookies) then redirects.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
