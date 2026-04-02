import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { questFromDb, questToDb } from '@/lib/supabase/mappers';
import type { JobQuest } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('job_quests')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(questFromDb(data));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const quest: JobQuest = await req.json();
  const supabase = createAdminClient();
  const dbData = questToDb({ ...quest, id: params.id, companyId: session.company.id });
  const { id: _id, created_at: _ca, ...updateData } = dbData;

  const { data, error } = await supabase
    .from('job_quests')
    .update(updateData)
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(questFromDb(data!));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  await supabase.from('job_quests').delete().eq('id', params.id).eq('company_id', session.company.id);
  return NextResponse.json({ ok: true });
}
