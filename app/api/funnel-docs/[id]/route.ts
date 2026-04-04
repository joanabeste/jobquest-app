import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { ownsContent } from '../_shared';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from('funnel_docs')
    .select('content_id, content_type')
    .eq('id', id)
    .single();

  if (!doc) return NextResponse.json({ ok: true }); // already gone

  if (!await ownsContent(session.company.id, doc.content_id, doc.content_type)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await admin.from('funnel_docs').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
