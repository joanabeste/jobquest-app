import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { checkQuota } from '@/lib/quota';
import { DEFAULT_PLAN, type ContentType } from '@/lib/types';
import type { DbRow } from '@/lib/supabase/row-helpers';

// Closed allowlist of tables this helper may write to.
type ContentTable = 'job_quests' | 'career_checks' | 'form_pages';

interface ContentRouteOptions<T extends { id: string; companyId: string }> {
  table: ContentTable;
  quotaKind: ContentType;
  quotaLabel: string;
  fromDb: (row: DbRow) => T;
  toDb: (item: T) => Record<string, unknown>;
  /**
   * Optional Zod schema for the POST body. Strongly recommended; without it
   * the client controls the entire payload shape.
   */
  bodySchema?: ZodType<T>;
}

/**
 * Standard list + create endpoints for content tables (quests / career-checks
 * / form-pages). Centralises:
 *  - auth
 *  - quota check on POST
 *  - generic 500s (Supabase errors only in server logs)
 *  - company_id scoping (defence in depth on top of RLS)
 */
export function createContentRoute<T extends { id: string; companyId: string }>(
  opts: ContentRouteOptions<T>,
) {
  async function GET() {
    const session = await getSession();
    if (!session) return unauthorized();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(opts.table)
      .select('*')
      .eq('company_id', session.company.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(`[content:${opts.table}] list failed`, error);
      return NextResponse.json({ error: 'list_failed' }, { status: 500 });
    }
    return NextResponse.json((data ?? []).map((row) => opts.fromDb(row as DbRow)));
  }

  async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return unauthorized();

    const quota = await checkQuota(
      session.company.id,
      opts.quotaKind,
      session.company.plan ?? DEFAULT_PLAN,
    );
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Kontingent erreicht: ${quota.current} von ${quota.max} ${opts.quotaLabel} verwendet.` },
        { status: 403 },
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    let item: T;
    if (opts.bodySchema) {
      const parsed = opts.bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: 'validation_error' }, { status: 400 });
      }
      item = parsed.data;
    } else {
      item = raw as T;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(opts.table)
      .insert(opts.toDb({ ...item, companyId: session.company.id }))
      .select()
      .single();

    if (error) {
      console.error(`[content:${opts.table}] insert failed`, error);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
    return NextResponse.json(opts.fromDb(data as DbRow));
  }

  return { GET, POST };
}
