import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Generic route wrapper.
 *
 * Centralises:
 *  - JSON body parsing + Zod validation (→ 400 with safe error shape)
 *  - Authentication (→ 401 if `auth: 'user'` and no session)
 *  - Top-level try/catch with safe 500 (no internal leak)
 *  - Consistent JSON error envelope: `{ error, code, issues? }`
 *
 * Internals stay in server logs; the client only ever sees `safeMessage`.
 *
 * Phase-1 wrapper. As routes migrate, extend here rather than in handlers.
 */

export type RouteContext<TBody, TAuth extends 'user' | 'public'> = {
  req: NextRequest;
  body: TBody;
  user: TAuth extends 'user' ? User : User | null;
};

type Handler<TBody, TAuth extends 'user' | 'public'> = (
  ctx: RouteContext<TBody, TAuth>,
) => Promise<NextResponse> | NextResponse;

type Options<TBody, TAuth extends 'user' | 'public'> = {
  body?: ZodType<TBody>;
  auth?: TAuth;
  handler: Handler<TBody, TAuth>;
};

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export function withRoute<TBody = undefined, TAuth extends 'user' | 'public' = 'public'>(
  opts: Options<TBody, TAuth>,
) {
  return async function routeHandler(req: NextRequest): Promise<NextResponse> {
    try {
      // 1. Body parse + validate (only for methods with a body)
      let body = undefined as unknown as TBody;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return jsonError(400, 'invalid_json', 'Ungültiger JSON-Body.');
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) {
          return jsonError(400, 'validation_error', 'Eingabedaten ungültig.', {
            issues: flattenZodIssues(parsed.error),
          });
        }
        body = parsed.data;
      }

      // 2. Auth
      let user: User | null = null;
      if (opts.auth === 'user') {
        const supabase = await createServerSupabaseClient();
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (!u) {
          return jsonError(401, 'unauthorized', 'Nicht angemeldet.');
        }
        user = u;
      }

      // 3. Handler
      return await opts.handler({
        req,
        body,
        user: user as RouteContext<TBody, TAuth>['user'],
      });
    } catch (err) {
      // Never leak internals.
      console.error('[withRoute] unhandled error', err);
      return jsonError(500, 'server_error', 'Interner Serverfehler.');
    }
  };
}

function flattenZodIssues(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}
