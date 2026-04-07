import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Root proxy (formerly middleware.ts) – Phase 2 (enforcing).
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth session cookie on every matched request.
 *  2. Hard-block unauthenticated access to protected route groups by
 *     redirecting to /login.
 *  3. CSRF defence: reject state-changing API requests whose Origin (or
 *     Referer fallback) does not match the request host. Public
 *     funnel/lead-submission endpoints are exempted.
 */

// Path prefixes that should require an authenticated user.
// Mirrors the `app/(protected)` route group. Keep this list in sync.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/uebersicht',
  '/leads',
  '/berufscheck-leads',
  '/berufscheck-editor',
  '/formular-editor',
  '/editor',
  '/company-profile',
  '/einstellungen',
  '/settings',
  '/statistiken',
  '/team',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// State-changing methods we CSRF-check. GET/HEAD/OPTIONS are exempt by spec.
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// API paths that intentionally accept cross-origin requests.
const CSRF_EXEMPT_API_PREFIXES = [
  '/api/public/',
  '/api/admin/impersonate/start',
];

function csrfRejected(request: NextRequest): boolean {
  if (!STATE_CHANGING.has(request.method)) return false;
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/api/')) return false;
  if (CSRF_EXEMPT_API_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return false;
  }

  const host = request.headers.get('host');
  if (!host) return true;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }

  const referer = request.headers.get('referer');
  if (!referer) return true;
  try {
    return new URL(referer).host !== host;
  } catch {
    return true;
  }
}

export default async function proxy(request: NextRequest) {
  if (csrfRejected(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'csrf_blocked' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
