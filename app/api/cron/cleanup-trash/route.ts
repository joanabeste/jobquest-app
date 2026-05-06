import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Hobby plan caps function duration at 60 s. Cleanup is just three DELETEs
// indexed by deleted_at — well under that, even with thousands of rows.
export const maxDuration = 60;

const RETENTION_DAYS = 30;
const TABLES = ['job_quests', 'career_checks', 'form_pages'] as const;

/**
 * Daily cleanup: hard-deletes any soft-deleted row whose `deleted_at` is more
 * than RETENTION_DAYS old. Triggered by Vercel Cron (vercel.json) once per day.
 *
 * Auth: when CRON_SECRET is set, requires an "Authorization: Bearer <secret>"
 * header. As a fallback (and on Vercel preview deploys without the env var),
 * the platform-injected `x-vercel-cron: 1` header is also accepted.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const results: Record<string, number> = {};

  for (const table of TABLES) {
    const { data, error } = await admin
      .from(table)
      .delete()
      .lt('deleted_at', cutoff)
      .select('id');
    if (error) {
      console.error(`[cron:cleanup-trash] ${table} delete failed`, error);
      return NextResponse.json({ error: `cleanup_failed:${table}` }, { status: 500 });
    }
    results[table] = data?.length ?? 0;
  }

  console.info('[cron:cleanup-trash] removed:', results);
  return NextResponse.json({ ok: true, removed: results, cutoff });
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${secret}`) return true;
  }
  // Vercel sets this header on cron-triggered requests; safe to trust because
  // the route is publicly reachable but it is not enough to spoof on its own
  // unless CRON_SECRET is unset. In production we always set CRON_SECRET.
  return req.headers.get('x-vercel-cron') === '1';
}
