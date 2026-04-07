import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { analyticsFromDb } from '@/lib/supabase/mappers';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const questId = req.nextUrl.searchParams.get('questId');
  const checkId = req.nextUrl.searchParams.get('checkId');
  const formId = req.nextUrl.searchParams.get('formId');
  const supabase = createAdminClient();

  if (questId) {
    // Verify quest belongs to company
    const { data: quest } = await supabase
      .from('job_quests')
      .select('id')
      .eq('id', questId)
      .eq('company_id', session.company.id)
      .single();
    if (!quest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('job_quest_id', questId)
      .order('timestamp', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data!.map(analyticsFromDb));
  }

  if (checkId) {
    // Verify check belongs to company
    const { data: check } = await supabase
      .from('career_checks')
      .select('id')
      .eq('id', checkId)
      .eq('company_id', session.company.id)
      .single();
    if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('career_check_id', checkId)
      .order('timestamp', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data!.map(analyticsFromDb));
  }

  if (formId) {
    // Verify form belongs to company
    const { data: form } = await supabase
      .from('form_pages')
      .select('id')
      .eq('id', formId)
      .eq('company_id', session.company.id)
      .single();
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('form_page_id', formId)
      .order('timestamp', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data!.map(analyticsFromDb));
  }

  // Company-wide: all quest + career-check + form-page events for this company
  const [questsRes, checksRes, formsRes] = await Promise.all([
    supabase.from('job_quests').select('id').eq('company_id', session.company.id),
    supabase.from('career_checks').select('id').eq('company_id', session.company.id),
    supabase.from('form_pages').select('id').eq('company_id', session.company.id),
  ]);
  if (questsRes.error) return NextResponse.json({ error: questsRes.error.message }, { status: 500 });
  if (checksRes.error) return NextResponse.json({ error: checksRes.error.message }, { status: 500 });
  if (formsRes.error) return NextResponse.json({ error: formsRes.error.message }, { status: 500 });
  const questIds = (questsRes.data ?? []).map((q) => q.id);
  const checkIds = (checksRes.data ?? []).map((c) => c.id);
  const formIds = (formsRes.data ?? []).map((f) => f.id);
  if (questIds.length === 0 && checkIds.length === 0 && formIds.length === 0) return NextResponse.json([]);

  const orParts: string[] = [];
  if (questIds.length > 0) orParts.push(`job_quest_id.in.(${questIds.join(',')})`);
  if (checkIds.length > 0) orParts.push(`career_check_id.in.(${checkIds.join(',')})`);
  if (formIds.length > 0) orParts.push(`form_page_id.in.(${formIds.join(',')})`);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .or(orParts.join(','))
    .order('timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.map(analyticsFromDb));
}
