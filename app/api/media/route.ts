import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MediaAsset } from '@/lib/types';

const BUCKET = 'quest-media';

function rowToAsset(row: Record<string, unknown>): MediaAsset {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    url: row.url as string,
    filename: row.filename as string,
    sizeBytes: (row.size_bytes as number | null) ?? undefined,
    mimeType: (row.mime_type as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

/** GET /api/media — list all media assets for the current company */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('company_id', session.company.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(rowToAsset));
}

/** POST /api/media — upload a new image and create a media asset */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage (kein FormData)' }, { status: 400 });
  }

  const file = formData.get('file');
  const isFile = file instanceof Blob && typeof (file as Blob & { name?: string }).name === 'string';
  if (!isFile) return NextResponse.json({ error: 'Keine Datei gefunden' }, { status: 400 });

  const fileName = (file as Blob & { name: string }).name;
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Nur Bilder erlaubt' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (bucketErr && !bucketErr.message.includes('already exists')) {
      return NextResponse.json({ error: `Bucket konnte nicht erstellt werden: ${bucketErr.message}` }, { status: 500 });
    }
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${session.company.id}/${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: assetRow, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      company_id: session.company.id,
      url: urlData.publicUrl,
      filename: fileName,
      size_bytes: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(rowToAsset(assetRow!));
}
