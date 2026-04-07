import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const slug = req.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) return NextResponse.json({ available: false, reason: 'empty' });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .neq('id', session.company.id)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
