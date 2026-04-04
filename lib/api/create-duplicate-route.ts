import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

interface DuplicateRouteOptions<T> {
  table: string;
  fromDb: (row: Record<string, unknown>) => T;
  buildCopy: (
    original: Record<string, unknown>,
    overrides: { id: string; slug: string; companyId: string; now: string },
  ) => Record<string, unknown>;
}

/**
 * Creates a POST handler that duplicates a row in the given table,
 * scoped to the current session's company.
 */
export function createDuplicateRoute<T>(opts: DuplicateRouteOptions<T>) {
  return async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const { newId, newSlug } = await req.json();
    const supabase = createAdminClient();

    const { data: original } = await supabase
      .from(opts.table)
      .select('*')
      .eq('id', id)
      .eq('company_id', session.company.id)
      .single();

    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const now = new Date().toISOString();
    const copy = opts.buildCopy(original as Record<string, unknown>, {
      id: newId,
      slug: newSlug,
      companyId: session.company.id,
      now,
    });

    const { data, error } = await supabase.from(opts.table).insert(copy).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(opts.fromDb(data! as Record<string, unknown>));
  };
}
