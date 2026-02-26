import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { careerCheckFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { newId, newSlug } = await req.json();
  const supabase = createAdminClient();

  const { data: original } = await supabase
    .from('career_checks')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .single();

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = (original.blocks as any[]).map((b: Record<string, unknown>) => ({ ...b, id: crypto.randomUUID() }));
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('career_checks')
    .insert({
      id: newId,
      company_id: session.company.id,
      title: `${original.title} (Kopie)`,
      slug: newSlug,
      status: 'draft',
      blocks: blocks,
      dimensions: original.dimensions,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(careerCheckFromDb(data!));
}
