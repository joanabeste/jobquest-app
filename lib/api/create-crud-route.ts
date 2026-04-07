import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

type RouteContext = { params: Promise<{ id: string }> };

interface CrudRouteOptions<T extends { id: string; companyId: string }> {
  table: string;
  fromDb: (row: Record<string, unknown>) => T;
  toDb: (item: T) => Record<string, unknown>;
  /**
   * Optional Zod schema for the PUT body. When provided, the body is parsed +
   * validated before reaching `toDb`. Strongly recommended — without it the
   * caller must trust whatever shape the client sends.
   */
  bodySchema?: ZodType<T>;
}

/**
 * Creates GET, PUT, and DELETE handlers for a Supabase table that is always
 * scoped to the current session's company.
 *
 * Error messages are generic on purpose: Supabase error details (constraint
 * names, column names) are logged server-side but never returned to the
 * client. The lone exception is the PGRST116 → 404 mapping which `apiUpsert`
 * relies on to fall back to POST.
 */
export function createCrudRoute<T extends { id: string; companyId: string }>(
  opts: CrudRouteOptions<T>,
) {
  async function GET(_req: NextRequest, { params }: RouteContext) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from(opts.table)
      .select('*')
      .eq('id', id)
      .eq('company_id', session.company.id)
      .single();

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(opts.fromDb(data as Record<string, unknown>));
  }

  async function PUT(req: NextRequest, { params }: RouteContext) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    let body: T;
    if (opts.bodySchema) {
      const parsed = opts.bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: 'validation_error' }, { status: 400 });
      }
      body = parsed.data;
    } else {
      body = raw as T;
    }

    const supabase = createAdminClient();
    const dbData = opts.toDb({ ...body, id, companyId: session.company.id });

    // Strip immutable columns before update.
    const { id: _id, created_at: _ca, ...updateData } = dbData as Record<string, unknown>;

    const { data, error } = await supabase
      .from(opts.table)
      .update(updateData)
      .eq('id', id)
      .eq('company_id', session.company.id)
      .select()
      .single();

    if (error) {
      // PGRST116 = "0 rows returned" by .single() — record doesn't exist yet,
      // signal 404 so apiUpsert falls back to POST.
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      console.error(`[crud:${opts.table}] update failed`, error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(opts.fromDb(data as Record<string, unknown>));
  }

  async function DELETE(_req: NextRequest, { params }: RouteContext) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from(opts.table)
      .delete()
      .eq('id', id)
      .eq('company_id', session.company.id);
    if (error) {
      console.error(`[crud:${opts.table}] delete failed`, error);
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return { GET, PUT, DELETE };
}
