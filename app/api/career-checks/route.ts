import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { careerCheckFromDb, careerCheckToDb } from '@/lib/supabase/mappers';
import { checkQuota } from '@/lib/quota';
import { DEFAULT_PLAN } from '@/lib/types';
import type { CareerCheck } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('career_checks')
    .select('*')
    .eq('company_id', session.company.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(careerCheckFromDb));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const quota = await checkQuota(session.company.id, 'berufschecks', session.company.plan ?? DEFAULT_PLAN);
  if (!quota.allowed) {
    return NextResponse.json({ error: `Kontingent erreicht: ${quota.current} von ${quota.max} Berufschecks verwendet.` }, { status: 403 });
  }

  let check: CareerCheck;
  try {
    check = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('career_checks')
    .insert(careerCheckToDb({ ...check, companyId: session.company.id }))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(careerCheckFromDb(data!));
}
