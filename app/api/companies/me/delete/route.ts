import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession, unauthorized } from '@/lib/api-auth';
import { deleteCompanyCascade } from '@/lib/api/company-delete';

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  const result = await deleteCompanyCascade(session.company.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  // Sign out
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
