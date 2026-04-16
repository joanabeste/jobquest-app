import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { commentFromDb } from '@/lib/supabase/mappers';
import { ownsFunnelDoc } from '../funnel-docs/_shared';

const CreateCommentSchema = z.object({
  funnelDocId: z.string().uuid(),
  pageId: z.string().min(1).max(100),
  blockId: z.string().max(100).optional(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
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
    .from('funnel_comments')
    .select('*')
    .eq('funnel_doc_id', funnelDocId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/funnel-comments]', error.message);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(commentFromDb));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = CreateCommentSchema.safeParse(raw);
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

  // Wenn ein parentId gesetzt ist, muss der Parent zum selben Funnel gehören
  const admin = createAdminClient();
  if (input.parentId) {
    const { data: parent } = await admin
      .from('funnel_comments')
      .select('funnel_doc_id')
      .eq('id', input.parentId)
      .single();
    if (!parent || parent.funnel_doc_id !== input.funnelDocId) {
      return NextResponse.json({ error: 'invalid_parent' }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from('funnel_comments')
    .insert({
      funnel_doc_id: input.funnelDocId,
      company_id: session.company.id,
      page_id: input.pageId,
      block_id: input.blockId ?? null,
      parent_id: input.parentId ?? null,
      author_type: 'member',
      author_member_id: session.member.id,
      author_name: session.member.name,
      author_email: session.member.email,
      content: input.content,
      status: 'open',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[POST /api/funnel-comments]', error?.message);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  return NextResponse.json(commentFromDb(data));
}
