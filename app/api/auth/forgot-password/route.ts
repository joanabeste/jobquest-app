import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      'http://localhost:3000',
    ].filter(Boolean) as string[];

    const requestOrigin = req.headers.get('origin') ?? '';
    const safeOrigin = allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : (allowedOrigins[0] ?? 'http://localhost:3000');

    const supabase = await createServerSupabaseClient();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${safeOrigin}/reset-password`,
    });

    // Always return ok to avoid email enumeration
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
