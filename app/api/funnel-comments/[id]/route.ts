import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { commentFromDb } from '@/lib/supabase/mappers';

const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  status: z.enum(['open', 'resolved']).optional(),
});

// Nur Author oder Admin darf bearbeiten/löschen.
function canModify(
  comment: { author_member_id: string | null; company_id: string },
  session: { member: { id: string; role: string; companyId: string }; company: { id: string } },
): boolean {
  if (comment.company_id !== session.company.id) return false;
  if (session.member.role === 'admin' || session.member.role === 'platform_admin') return true;
  return comment.author_member_id === session.member.id;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = UpdateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({
      error: `validation_error (${issue?.path.join('.')}): ${issue?.message}`,
    }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('funnel_comments')
    .select('author_member_id, company_id, status')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!canModify(existing, session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) patch.content = parsed.data.content;
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    if (parsed.data.status === 'resolved' && existing.status !== 'resolved') {
      patch.resolved_by = session.member.id;
      patch.resolved_at = new Date().toISOString();
    } else if (parsed.data.status === 'open') {
      patch.resolved_by = null;
      patch.resolved_at = null;
    }
  }

  const { data, error } = await admin
    .from('funnel_comments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('[PATCH /api/funnel-comments/:id]', error?.message);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json(commentFromDb(data));
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
    .from('funnel_comments')
    .select('author_member_id, company_id')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!canModify(existing, session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('funnel_comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[DELETE /api/funnel-comments/:id]', error.message);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
