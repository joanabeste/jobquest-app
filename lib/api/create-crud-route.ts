import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

type RouteContext = { params: Promise<{ id: string }> };

interface CrudRouteOptions<T extends { id: string; companyId: string }> {
  table: string;
  fromDb: (row: Record<string, unknown>) => T;
  toDb: (item: T) => Record<string, unknown>;
}

/**
 * Creates GET, PUT, and DELETE handlers for a Supabase table
 * that is always scoped to the current session's company.
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
    const body: T = await req.json();
    const supabase = createAdminClient();
    const dbData = opts.toDb({ ...body, id, companyId: session.company.id });

    // Strip immutable columns before update
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _ca, ...updateData } = dbData as Record<string, unknown>;

    const { data, error } = await supabase
      .from(opts.table)
      .update(updateData)
      .eq('id', id)
      .eq('company_id', session.company.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(opts.fromDb(data as Record<string, unknown>));
  }

  async function DELETE(_req: NextRequest, { params }: RouteContext) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from(opts.table).delete().eq('id', id).eq('company_id', session.company.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return { GET, PUT, DELETE };
}
