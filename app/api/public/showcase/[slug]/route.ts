import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb, questFromDb, careerCheckFromDb } from '@/lib/supabase/mappers';

/** Public API: returns showcase data for a company slug (no auth required). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!companyRow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const company = companyFromDb(companyRow);
  if (!company.showcase?.enabled) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Load published quests and checks for this company
  const [questsRes, checksRes] = await Promise.all([
    supabase.from('job_quests').select('*').eq('company_id', company.id).eq('status', 'published'),
    supabase.from('career_checks').select('*').eq('company_id', company.id).eq('status', 'published'),
  ]);

  const quests = (questsRes.data ?? []).map((r) => questFromDb(r as Record<string, unknown>));
  const checks = (checksRes.data ?? []).map((r) => careerCheckFromDb(r as Record<string, unknown>));

  const qById = new Map(quests.map((q) => [q.id, q]));
  const cById = new Map(checks.map((c) => [c.id, c]));

  const items = company.showcase.items
    .map((it) => {
      if (it.type === 'jobquest') {
        const q = qById.get(it.contentId);
        if (!q) return null;
        return { id: it.id, type: 'jobquest', title: q.title, slug: q.slug, cardImage: q.cardImage };
      }
      const c = cById.get(it.contentId);
      if (!c) return null;
      return { id: it.id, type: 'berufscheck', title: c.title, slug: c.slug, cardImage: c.cardImage };
    })
    .filter(Boolean);

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      logo: company.logo,
      description: company.description,
      corporateDesign: company.corporateDesign,
      showcase: company.showcase,
      privacyUrl: company.privacyUrl,
      imprintUrl: company.imprintUrl,
    },
    items,
  });
}
