import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { reviewLinkFromDb } from '@/lib/supabase/mappers';

const UpdateReviewLinkSchema = z.object({
  label: z.string().max(120).optional(),
  // revoke: true → setzt revoked_at auf jetzt
  revoke: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = UpdateReviewLinkSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({
      error: `validation_error (${issue?.path.join('.')}): ${issue?.message}`,
    }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('review_links')
    .select('company_id')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.company_id !== session.company.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.label !== undefined) patch.label = parsed.data.label;
  if (parsed.data.revoke === true) patch.revoked_at = new Date().toISOString();

  const { data, error } = await admin
    .from('review_links')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('[PATCH /api/review-links/:id]', error?.message);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json(reviewLinkFromDb(data));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('review_links')
    .select('company_id')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.company_id !== session.company.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('review_links').delete().eq('id', id);
  if (error) {
    console.error('[DELETE /api/review-links/:id]', error.message);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
