import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const admin = createAdminClient();

  // Fetch doc and verify ownership via its linked content
  const { data: doc } = await admin.from('funnel_docs').select('content_id, content_type').eq('id', params.id).single();
  if (!doc) return NextResponse.json({ ok: true }); // already gone

  const tableMap: Record<string, string> = { quest: 'job_quests', check: 'career_checks', form: 'form_pages' };
  const table = tableMap[doc.content_type];
  if (table) {
    const { data: content } = await admin.from(table).select('id').eq('id', doc.content_id).eq('company_id', session.company.id).single();
    if (!content) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await admin.from('funnel_docs').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
