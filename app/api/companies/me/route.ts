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

  let company: Company;
  try {
    company = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const dbData = companyToDb({ ...company, id: session.company.id });
  const { id: _id, ...updateData } = dbData;

  // If a slug is being set, verify it's not already taken by another company.
  if (updateData.slug) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', updateData.slug)
      .neq('id', session.company.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'Dieser Link ist bereits vergeben. Bitte wähle einen anderen.', code: 'slug_taken' },
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', session.company.id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Dieser Link ist bereits vergeben. Bitte wähle einen anderen.', code: 'slug_taken' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(companyFromDb(data!));
}
