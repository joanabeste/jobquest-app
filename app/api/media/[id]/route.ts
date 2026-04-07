import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'quest-media';

/** DELETE /api/media/[id] — delete a media asset (DB row + storage file) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const supabase = createAdminClient();

  // Look up asset
  const { data: asset } = await supabase
    .from('media_assets')
    .select('url')
    .eq('id', id)
    .eq('company_id', session.company.id)
    .single();

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Extract storage path from URL: .../storage/v1/object/public/quest-media/<companyId>/<file>
  const match = (asset.url as string).match(/quest-media\/(.+)$/);
  if (match) {
    await supabase.storage.from(BUCKET).remove([match[1]]);
  }

  await supabase.from('media_assets').delete().eq('id', id).eq('company_id', session.company.id);
  return NextResponse.json({ ok: true });
}
