import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { formPageFromDb, formPageToDb } from '@/lib/supabase/mappers';
import type { FormPage } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('form_pages')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(formPageFromDb(data));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const form: FormPage = await req.json();
  const supabase = createAdminClient();
  const dbData = formPageToDb({ ...form, id: params.id, companyId: session.company.id });
  const { id: _id, created_at: _ca, ...updateData } = dbData; // eslint-disable-line @typescript-eslint/no-unused-vars

  const { data, error } = await supabase
    .from('form_pages')
    .update(updateData)
    .eq('id', params.id)
    .eq('company_id', session.company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(formPageFromDb(data!));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  await supabase.from('form_pages').delete().eq('id', params.id).eq('company_id', session.company.id);
  return NextResponse.json({ ok: true });
}
