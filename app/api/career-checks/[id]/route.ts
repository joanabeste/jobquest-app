import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { careerCheckFromDb, careerCheckToDb } from '@/lib/supabase/mappers';
import type { CareerCheck } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('career_checks')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(careerCheckFromDb(data));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const check: CareerCheck = await req.json();
  const supabase = createAdminClient();
  const dbData = careerCheckToDb({ ...check, id: params.id, companyId: session.company.id });
  const { id: _id, created_at: _ca, ...updateData } = dbData; // eslint-disable-line @typescript-eslint/no-unused-vars

  const { data, error } = await supabase
    .from('career_checks')
    .update(updateData)
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(careerCheckFromDb(data!));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  await supabase.from('career_checks').delete().eq('id', params.id).eq('company_id', session.company.id);
  return NextResponse.json({ ok: true });
}
