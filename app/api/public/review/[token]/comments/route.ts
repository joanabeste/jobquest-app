import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { commentFromDb } from '@/lib/supabase/mappers';

const CreateExternalCommentSchema = z.object({
  authorName: z.string().min(1).max(80),
  authorEmail: z.string().email().max(200).optional(),
  pageId: z.string().min(1).max(100),
  blockId: z.string().max(100).optional(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
});

// Externer Reviewer legt einen Kommentar an. Authentifizierung erfolgt
// ausschließlich über den Review-Token in der URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = CreateExternalCommentSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({
      error: `validation_error (${issue?.path.join('.')}): ${issue?.message}`,
    }, { status: 400 });
  }

  const input = parsed.data;
  const admin = createAdminClient();

  // Token-Validierung
  const { data: link } = await admin
    .from('review_links')
    .select('id, funnel_doc_id, company_id, can_comment, expires_at, revoked_at')
    .eq('token', token)
    .single();

  if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  if (link.revoked_at) return NextResponse.json({ error: 'revoked' }, { status: 410 });
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  if (!link.can_comment) {
    return NextResponse.json({ error: 'read_only' }, { status: 403 });
  }

  // Parent muss zum selben Doc gehören
  if (input.parentId) {
    const { data: parent } = await admin
      .from('funnel_comments')
      .select('funnel_doc_id')
      .eq('id', input.parentId)
      .single();
    if (!parent || parent.funnel_doc_id !== link.funnel_doc_id) {
      return NextResponse.json({ error: 'invalid_parent' }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from('funnel_comments')
    .insert({
      funnel_doc_id: link.funnel_doc_id,
      company_id: link.company_id,
      page_id: input.pageId,
      block_id: input.blockId ?? null,
      parent_id: input.parentId ?? null,
      author_type: 'external',
      author_member_id: null,
      author_name: input.authorName,
      author_email: input.authorEmail ?? null,
      content: input.content,
      status: 'open',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[POST /api/public/review/:token/comments]', error?.message);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  return NextResponse.json(commentFromDb(data));
}
