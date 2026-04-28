import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb } from '@/lib/supabase/mappers';
import PublicCheckClient from './PublicCheckClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: checkRow } = await supabase
    .from('career_checks')
    .select('title, company_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!checkRow) return { title: 'Berufscheck nicht gefunden' };

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', checkRow.company_id)
    .single();

  if (!companyRow) return { title: checkRow.title };

  const company = companyFromDb(companyRow);
  const title = `${checkRow.title} – ${company.name}`;
  const description = `Finde heraus, welcher Beruf zu dir passt! Berufscheck von ${company.name}.`;

  const favicon = company.corporateDesign?.faviconUrl ?? company.logo;
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'JobQuest',
      ...(company.logo ? { images: [{ url: company.logo, width: 200, height: 200, alt: company.name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(company.logo ? { images: [company.logo] } : {}),
    },
  };
}

export default function PublicCheckPage() {
  return <PublicCheckClient />;
}
