import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ForgotPasswordSchema = z.object({
  email: z.string().email().max(320),
});

export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      // Even on bad input, return generic ok to prevent enumeration via
      // distinguishing 400 vs 200.
      return NextResponse.json({ ok: true });
    }
    const parsed = ForgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }
    const { email } = parsed.data;

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
