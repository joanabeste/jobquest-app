import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { questFromDb } from '@/lib/supabase/mappers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const { newId, newSlug } = await req.json();
  const supabase = createAdminClient();

  const { data: original } = await supabase
    .from('job_quests')
    .select('*')
    .eq('id', id)
    .eq('company_id', session.company.id)
    .single();

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modules = (original.modules as any[]).map((m: Record<string, unknown>) => ({ ...m, id: crypto.randomUUID() }));
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('job_quests')
    .insert({
      id: newId,
      company_id: session.company.id,
      title: `${original.title} (Kopie)`,
      slug: newSlug,
      status: 'draft',
      modules: modules,
      lead_config: original.lead_config,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(questFromDb(data!));
}
