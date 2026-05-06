import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { checkQuota } from '@/lib/quota';
import { DEFAULT_PLAN, type ContentType } from '@/lib/types';

type RouteContext = { params: Promise<{ id: string }> };

interface TrashRouteOptions {
  table: 'job_quests' | 'career_checks' | 'form_pages';
  /**
   * Quota check that runs before restoring a soft-deleted row. Without this
   * a user could exceed their plan by repeatedly trashing and restoring the
   * same content slot.
   */
  quotaKind: ContentType;
  quotaLabel: string;
}

/**
 * Returns POST (restore) and DELETE (permanent delete) handlers for a
 * soft-deletable content table. Both are scoped to the current session's
 * company and only operate on rows that are currently in the trash
 * (`deleted_at IS NOT NULL`) — operating on a live row is a no-op.
 */
export function createTrashRoute(opts: TrashRouteOptions) {
  async function POST(_req: NextRequest, { params }: RouteContext) {
    const session = await getSession();
    if (!session) return unauthorized();

    const quota = await checkQuota(
      session.company.id,
      opts.quotaKind,
      session.company.plan ?? DEFAULT_PLAN,
    );
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Wiederherstellen nicht möglich: Kontingent voll (${quota.current} von ${quota.max} ${opts.quotaLabel}).` },
        { status: 403 },
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from(opts.table)
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('company_id', session.company.id)
      .not('deleted_at', 'is', null);
    if (error) {
      console.error(`[trash:${opts.table}] restore failed`, error);
      return NextResponse.json({ error: 'restore_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
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
      .eq('company_id', session.company.id)
      .not('deleted_at', 'is', null);
    if (error) {
      console.error(`[trash:${opts.table}] permanent delete failed`, error);
      return NextResponse.json({ error: 'permanent_delete_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return { POST, DELETE };
}
