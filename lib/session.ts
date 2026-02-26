import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'jq_session';
const SECRET = () => process.env.SESSION_SECRET || 'dev-fallback-secret-do-not-use-in-prod';

export function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', SECRET());
  hmac.update(value);
  return value + '.' + hmac.digest('base64url');
}

export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  if (sign(value) === signed) return value;
  return null;
}

export function getSessionMemberId(): string | null {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie) return null;
    return unsign(cookie.value);
  } catch {
    return null;
  }
}

export function createSessionResponse(memberId: string, body: unknown, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  res.cookies.set(COOKIE_NAME, sign(memberId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export function clearSessionResponse(body: unknown = { ok: true }, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
