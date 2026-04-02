import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { companyFromDb, companyToDb } from '@/lib/supabase/mappers';
import type { Company } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return NextResponse.json(session.company);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const company: Company = await req.json();
  const supabase = createAdminClient();
  const dbData = companyToDb({ ...company, id: session.company.id });
  const { id: _id, ...updateData } = dbData;

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', session.company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(companyFromDb(data!));
}
