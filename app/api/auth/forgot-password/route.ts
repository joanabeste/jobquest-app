import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    const supabase = await createServerSupabaseClient();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // Always return ok to avoid email enumeration
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
