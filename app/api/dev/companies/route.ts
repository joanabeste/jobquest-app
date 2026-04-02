import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb, memberFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const devPw = req.nextUrl.searchParams.get('pw');
  if (!process.env.DEV_PASSWORD || devPw !== process.env.DEV_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: companies } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
  const { data: members } = await supabase.from('workspace_members').select('*');

  const result = (companies ?? []).map(c => {
    const comp = companyFromDb(c);
    const compMembers = (members ?? [])
      .filter(m => m.company_id === c.id && m.role !== 'platform_admin')
      .map(memberFromDb);
    return { ...comp, memberCount: compMembers.length };
  });

  return NextResponse.json(result);
}
