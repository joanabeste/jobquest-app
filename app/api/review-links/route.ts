import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { reviewLinkFromDb } from '@/lib/supabase/mappers';
import { ownsFunnelDoc } from '../funnel-docs/_shared';

const CreateReviewLinkSchema = z.object({
  funnelDocId: z.string().uuid(),
  label: z.string().max(120).optional(),
  canComment: z.boolean().optional().default(true),
  // expiresInDays: null | Tage bis Ablauf (unbegrenzt = null)
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const funnelDocId = req.nextUrl.searchParams.get('funnelDocId');
  if (!funnelDocId) {
    return NextResponse.json({ error: 'funnelDocId required' }, { status: 400 });
  }

  if (!await ownsFunnelDoc(session.company.id, funnelDocId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('review_links')
    .select('*')
    .eq('funnel_doc_id', funnelDocId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/review-links]', error.message);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(reviewLinkFromDb));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = CreateReviewLinkSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({
      error: `validation_error (${issue?.path.join('.')}): ${issue?.message}`,
    }, { status: 400 });
  }

  const input = parsed.data;

  if (!await ownsFunnelDoc(session.company.id, input.funnelDocId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = randomBytes(16).toString('hex');
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('review_links')
    .insert({
      funnel_doc_id: input.funnelDocId,
      company_id: session.company.id,
      token,
      label: input.label ?? null,
      can_comment: input.canComment,
      expires_at: expiresAt,
      created_by: session.member.id,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[POST /api/review-links]', error?.message);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  return NextResponse.json(reviewLinkFromDb(data));
}
