import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { validateSlug, entityTypeToTable, type EntityType } from '@/lib/slug-validation';

const VALID_TYPES: EntityType[] = ['job_quest', 'career_check', 'form_page', 'company'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const { entityId, entityType, newSlug } = body as {
    entityId: string;
    entityType: EntityType;
    newSlug: string;
  };

  if (!entityId || !entityType || !newSlug) {
    return NextResponse.json({ error: 'Fehlende Felder.' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'Ungültiger Typ.' }, { status: 400 });
  }

  // Validate slug format
  const validation = validateSlug(newSlug);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const supabase = createAdminClient();
  const table = entityTypeToTable(entityType);

  // Verify the entity belongs to the user's company
  const companyIdColumn = entityType === 'company' ? 'id' : 'company_id';
  const { data: entity } = await supabase
    .from(table)
    .select('id, slug')
    .eq('id', entityId)
    .eq(companyIdColumn, session.company.id)
    .single();

  if (!entity) {
    return NextResponse.json({ error: 'Nicht gefunden oder kein Zugriff.' }, { status: 404 });
  }

  const oldSlug = (entity as Record<string, unknown>).slug as string;
  if (oldSlug === validation.sanitized) {
    return NextResponse.json({ slug: validation.sanitized });
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq('slug', validation.sanitized)
    .neq('id', entityId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Dieser Slug ist bereits vergeben.' }, { status: 409 });
  }

  // Check slug_redirects conflicts
  const { data: redirectConflict } = await supabase
    .from('slug_redirects')
    .select('id')
    .eq('old_slug', validation.sanitized)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (redirectConflict) {
    // Remove the conflicting redirect since the user is taking this slug
    await supabase.from('slug_redirects').delete().eq('id', redirectConflict.id);
  }

  // Save old slug as redirect
  if (oldSlug) {
    // Remove any existing redirect from this old_slug (upsert behavior)
    await supabase
      .from('slug_redirects')
      .delete()
      .eq('old_slug', oldSlug)
      .eq('entity_type', entityType);

    await supabase.from('slug_redirects').insert({
      old_slug: oldSlug,
      new_slug: validation.sanitized,
      entity_type: entityType,
      entity_id: entityId,
    });
  }

  // Update the entity's slug
  const { error: updateError } = await supabase
    .from(table)
    .update({ slug: validation.sanitized })
    .eq('id', entityId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ slug: validation.sanitized });
}
