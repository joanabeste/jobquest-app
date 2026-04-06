import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Use the browser's origin so the link always points to the correct domain,
    // whether running locally or on the live server.
    const origin = req.headers.get('origin')
      ?? process.env.NEXT_PUBLIC_SITE_URL
      ?? 'http://localhost:3000';

    // Use implicit flow (not PKCE) so the reset link works even when opened
    // on a different device — PKCE requires the verifier stored in the
    // originating browser's cookies, which isn't available cross-device.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { flowType: 'implicit' },
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) => cs.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          }),
        },
      },
    );

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    // Always return ok to avoid email enumeration
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
