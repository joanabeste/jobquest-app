import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { checkQuota } from '@/lib/quota';
import { DEFAULT_PLAN } from '@/lib/types';
import type { ContentType } from '@/lib/types';

const TABLE_TO_CONTENT_TYPE: Record<string, ContentType> = {
  job_quests: 'jobquests',
  career_checks: 'berufschecks',
  form_pages: 'formulare',
};

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

    const contentType = TABLE_TO_CONTENT_TYPE[opts.table];
    if (contentType) {
      const quota = await checkQuota(session.company.id, contentType, session.company.plan ?? DEFAULT_PLAN);
      if (!quota.allowed) {
        return NextResponse.json({ error: `Kontingent erreicht: ${quota.current} von ${quota.max} verwendet.` }, { status: 403 });
      }
    }

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
