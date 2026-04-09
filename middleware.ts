import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware – combines:
 *  1. Auth session refresh + route protection (from former proxy.ts)
 *  2. CSRF defence for state-changing API requests
 *  3. Custom domain routing for company-specific content
 */

// ─── App domain(s) ──────────────────────────────────────────────────────────
// The primary domain of the app. Requests to other hosts are treated as custom domains.
const APP_DOMAINS = new Set(
  (process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost:3000')
    .split(',')
    .map((d) => d.trim().toLowerCase()),
);

function isAppDomain(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, '');
  const hWithPort = host.toLowerCase();
  return APP_DOMAINS.has(h) || APP_DOMAINS.has(hWithPort) || h === 'localhost';
}

// ─── Protected paths ─────────────────────────────────────────────────────────
const PROTECTED_PREFIXES = [
  '/dashboard', '/uebersicht', '/leads', '/berufscheck-leads',
  '/berufscheck-editor', '/formular-editor', '/editor',
  '/company-profile', '/einstellungen', '/settings', '/statistiken', '/team',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// ─── CSRF ────────────────────────────────────────────────────────────────────
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_API_PREFIXES = ['/api/public/', '/api/admin/impersonate/start'];

function csrfRejected(request: NextRequest): boolean {
  if (!STATE_CHANGING.has(request.method)) return false;
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/api/')) return false;
  if (CSRF_EXEMPT_API_PREFIXES.some((p) => path === p || path.startsWith(p))) return false;

  const host = request.headers.get('host');
  if (!host) return true;

  const origin = request.headers.get('origin');
  if (origin) {
    try { return new URL(origin).host !== host; } catch { return true; }
  }
  const referer = request.headers.get('referer');
  if (!referer) return true;
  try { return new URL(referer).host !== host; } catch { return true; }
}

// ─── Custom domain routing ───────────────────────────────────────────────────
// Public path prefixes that are allowed on custom domains
const PUBLIC_CONTENT_PREFIXES = ['/jobquest/', '/berufscheck/', '/formular/'];

function isPublicContentPath(pathname: string): boolean {
  return PUBLIC_CONTENT_PREFIXES.some((p) => pathname.startsWith(p));
}

async function resolveCustomDomain(host: string): Promise<{ companyId: string; companySlug: string } | null> {
  // Look up the custom domain in Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const hostname = host.toLowerCase().replace(/:\d+$/, '');

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/companies?custom_domain=eq.${encodeURIComponent(hostname)}&domain_verified=eq.true&select=id,slug`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;
    return { companyId: rows[0].id, companySlug: rows[0].slug };
  } catch {
    return null;
  }
}

// ─── Main middleware ─────────────────────────────────────────────────────────
export default async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  // ── Custom domain handling ─────────────────────────────────────────────
  if (!isAppDomain(host)) {
    const company = await resolveCustomDomain(host);

    if (!company) {
      // Unknown custom domain – show 404
      return new NextResponse('Domain not configured', { status: 404 });
    }

    // Block protected/admin routes on custom domains
    if (isProtectedPath(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
      const appDomain = Array.from(APP_DOMAINS)[0] ?? 'localhost:3000';
      const protocol = request.nextUrl.protocol;
      return NextResponse.redirect(new URL(`${protocol}//${appDomain}${pathname}`, request.url));
    }

    // Root → rewrite to company showcase page
    if (pathname === '/' || pathname === '') {
      if (!company.companySlug) {
        return new NextResponse('Showcase not configured', { status: 404 });
      }
      const url = request.nextUrl.clone();
      url.pathname = `/c/${company.companySlug}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-company-id', company.companyId);
      return res;
    }

    // Public content paths – pass through with company context header
    if (isPublicContentPath(pathname)) {
      const res = NextResponse.next();
      res.headers.set('x-company-id', company.companyId);
      return res;
    }

    // Everything else on custom domain – pass through (static assets etc.)
    return NextResponse.next();
  }

  // ── Standard app domain handling ───────────────────────────────────────

  // CSRF check
  if (csrfRejected(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'csrf_blocked' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }

  // Session refresh
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

  // Auth gate for protected routes
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
