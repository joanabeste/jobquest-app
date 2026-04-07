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

  // If a slug is being set, retry with a fresh suffix on unique-violation
  // so two companies can never collide on the public showcase URL.
  let attempts = 0;
  let lastError: { code?: string; message: string } | null = null;
  while (attempts < 4) {
    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', session.company.id)
      .select()
      .single();
    if (!error) return NextResponse.json(companyFromDb(data!));
    lastError = error;
    if (error.code !== '23505' || updateData.slug == null) break;
    // Replace or append a random 4-char suffix
    const base = String(updateData.slug).replace(/-[a-z0-9]{4}$/, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    updateData.slug = `${base}-${suffix}`;
    attempts += 1;
  }
  return NextResponse.json({ error: lastError?.message ?? 'update failed' }, { status: 500 });
}
