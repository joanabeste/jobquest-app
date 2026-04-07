import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'email-attachments';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Strict MIME allowlist. Anything HTML/SVG/JS-adjacent is excluded because
// the bucket is public — a stored XSS via SVG <script> would be trivially
// reachable. Add to this list deliberately, never reflect client-supplied MIME.
const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
    }

    const file = formData.get('file');
    const isFile = file instanceof Blob && typeof (file as Blob & { name?: string }).name === 'string';
    if (!isFile) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }
    const blob = file as Blob & { name: string };
    const fileName = blob.name;

    // Reject too-large uploads BEFORE buffering them in memory.
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 413 });
    }

    // MIME allowlist — note `file.type` is client-controlled, so we use it
    // only as a coarse first gate. The bucket is public; HTML/SVG would
    // become reflected XSS vectors against any logged-in user who clicked
    // an attachment link.
    if (!ALLOWED_MIME.has(blob.type)) {
      return NextResponse.json({ error: 'unsupported_mime' }, { status: 415 });
    }

    const supabase = createAdminClient();

    // Path: company-scoped + random suffix so URLs are not enumerable via
    // Date.now() guessing. Sanitise filename hard.
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const random = crypto.randomBytes(8).toString('hex');
    const path = `${session.company.id}/${random}-${safeName}`;

    const bytes = await blob.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: blob.type, upsert: false });

    if (uploadError) {
      console.error('[upload-attachment] upload error:', uploadError);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl, filename: fileName });
  } catch (err) {
    console.error('[upload-attachment] unexpected error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
