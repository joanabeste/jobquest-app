import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { formPageFromDb, formPageToDb } from '@/lib/supabase/mappers';
import type { FormPage } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('form_pages')
    .select('*')
    .eq('company_id', session.company.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(formPageFromDb));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const form: FormPage = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('form_pages')
    .insert(formPageToDb({ ...form, companyId: session.company.id }))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(formPageFromDb(data!));
}
