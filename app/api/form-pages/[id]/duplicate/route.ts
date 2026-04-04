import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { formPageFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const { newId, newSlug } = await req.json();
  const supabase = createAdminClient();

  const { data: original } = await supabase
    .from('form_pages')
    .select('*')
    .eq('id', id)
    .eq('company_id', session.company.id)
    .single();

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('form_pages')
    .insert({
      id: newId,
      company_id: session.company.id,
      title: `${original.title} (Kopie)`,
      slug: newSlug,
      status: 'draft',
      content_blocks: original.content_blocks,
      form_steps: original.form_steps,
      form_config: original.form_config,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(formPageFromDb(data!));
}
