import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

// Bound the page size hard so an attacker (or a UI bug) can't pull millions
// of rows in one request.
const MAX_LIMIT = 200;
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** GET /api/admin/companies — list companies (platform_admin only) */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.member.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsedQuery = QuerySchema.safeParse({
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    offset: req.nextUrl.searchParams.get('offset') ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }
  const { limit, offset } = parsedQuery.data;

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from('companies')
    .select('id, name, contact_email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[admin/companies GET] failed', error);
    return NextResponse.json({ error: 'list_failed' }, { status: 500 });
  }
  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
