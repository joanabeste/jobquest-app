import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  await supabase.from('funnel_docs').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
