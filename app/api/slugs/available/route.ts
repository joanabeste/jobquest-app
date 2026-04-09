import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { validateSlug, entityTypeToTable, type EntityType } from '@/lib/slug-validation';

const VALID_TYPES: EntityType[] = ['job_quest', 'career_check', 'form_page', 'company'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const slug = req.nextUrl.searchParams.get('slug')?.trim();
  const type = req.nextUrl.searchParams.get('type') as EntityType | null;
  const excludeId = req.nextUrl.searchParams.get('excludeId');

  if (!slug) {
    return NextResponse.json({ available: false, reason: 'Slug darf nicht leer sein.' });
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ available: false, reason: 'Ungültiger Typ.' });
  }

  // Format validation
  const validation = validateSlug(slug);
  if (!validation.valid) {
    return NextResponse.json({ available: false, reason: validation.reason, sanitized: validation.sanitized });
  }

  const supabase = createAdminClient();
  const table = entityTypeToTable(type);

  // Check uniqueness in the entity table
  let query = supabase.from(table).select('id').eq('slug', validation.sanitized);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return NextResponse.json({ available: false, reason: 'Dieser Slug ist bereits vergeben.', sanitized: validation.sanitized });
  }

  // Check slug_redirects to prevent conflicts with active redirects
  const { data: redirect } = await supabase
    .from('slug_redirects')
    .select('id')
    .eq('old_slug', validation.sanitized)
    .eq('entity_type', type)
    .maybeSingle();

  if (redirect) {
    return NextResponse.json({ available: false, reason: 'Dieser Slug wird als Weiterleitung verwendet.', sanitized: validation.sanitized });
  }

  return NextResponse.json({ available: true, sanitized: validation.sanitized });
}
