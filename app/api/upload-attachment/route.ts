import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'email-attachments';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage (kein FormData)' }, { status: 400 });
    }

    const file = formData.get('file');
    // `File` is not a global in Node.js 18 — use Blob (File extends Blob) + name check
    const isFile = file instanceof Blob && typeof (file as Blob & { name?: string }).name === 'string';
    if (!isFile) {
      return NextResponse.json({ error: 'Keine Datei gefunden' }, { status: 400 });
    }
    const fileName = (file as Blob & { name: string }).name;

    const supabase = createAdminClient();

    // Ensure bucket exists
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.error('[upload-attachment] listBuckets error:', listErr);
      return NextResponse.json({ error: `Storage nicht erreichbar: ${listErr.message}` }, { status: 500 });
    }

    if (!buckets?.find((b) => b.name === BUCKET)) {
      const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (bucketErr && !bucketErr.message.includes('already exists')) {
        console.error('[upload-attachment] createBucket error:', bucketErr);
        return NextResponse.json({ error: `Bucket konnte nicht erstellt werden: ${bucketErr.message}` }, { status: 500 });
      }
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${session.company.id}/${Date.now()}-${safeName}`;
    const ext  = fileName.split('.').pop() ?? 'bin';

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || `application/${ext}`, upsert: false });

    if (uploadError) {
      console.error('[upload-attachment] upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl, filename: fileName });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload-attachment] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
