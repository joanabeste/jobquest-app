import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

const IdSchema = z.string().uuid();

// Closed allowlist of tables this helper may delete from. Prevents callers
// from passing arbitrary strings through string concatenation.
type ScopedTable = 'leads' | 'career_check_leads' | 'form_submissions';

/**
 * Creates a `DELETE /:id` handler that removes a single row, scoped to the
 * caller's company. Centralises:
 *  - auth check
 *  - UUID validation on the path param
 *  - generic 500s (Supabase errors only in server logs)
 *  - company_id scoping (defence in depth on top of RLS)
 */
export function createScopedDelete(table: ScopedTable) {
  return async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: rawId } = await params;
    const idParse = IdSchema.safeParse(rawId);
    if (!idParse.success) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from(table)
      .delete()
      .eq('id', idParse.data)
      .eq('company_id', session.company.id);

    if (error) {
      console.error(`[scoped-delete:${table}] failed`, error);
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  };
}
