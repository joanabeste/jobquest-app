import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb } from '@/lib/supabase/mappers';
import PublicQuestClient from './PublicQuestClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Fetch quest by slug
  const { data: questRow } = await supabase
    .from('job_quests')
    .select('title, company_id, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!questRow) {
    return { title: 'JobQuest nicht gefunden' };
  }

  // Fetch company
  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', questRow.company_id)
    .single();

  if (!companyRow) {
    return { title: questRow.title };
  }

  const company = companyFromDb(companyRow);
  const title = `${questRow.title} – ${company.name}`;
  const description = company.description
    ? `Erlebe einen virtuellen Arbeitstag bei ${company.name}. ${company.description.slice(0, 140)}`
    : `Erlebe einen virtuellen Arbeitstag als ${questRow.title} bei ${company.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'JobQuest',
      ...(company.logo ? { images: [{ url: company.logo, width: 200, height: 200, alt: company.name }] } : {}),
    },
    twitter: {
      card: company.logo ? 'summary' : 'summary',
      title,
      description,
      ...(company.logo ? { images: [company.logo] } : {}),
    },
  };
}

export default function PublicQuestPage() {
  return <PublicQuestClient />;
}
