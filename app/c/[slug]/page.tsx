import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb } from '@/lib/supabase/mappers';
import ShowcaseClient from './ShowcaseClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!companyRow) return { title: 'Übersicht nicht gefunden' };

  const company = companyFromDb(companyRow);
  if (!company.showcase?.enabled) return { title: 'Übersicht nicht gefunden' };

  const title = company.showcase.headline
    ? `${company.showcase.headline} – ${company.name}`
    : `${company.name} – Karriere`;
  const description = company.showcase.subtext
    ?? `Entdecke die offenen Ausbildungen und Berufschecks bei ${company.name}.`;

  const favicon = company.corporateDesign?.faviconUrl;
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: company.name,
      ...(company.logo ? { images: [{ url: company.logo, width: 512, height: 512, alt: company.name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(company.logo ? { images: [company.logo] } : {}),
    },
  };
}

export default function ShowcasePage() {
  return <ShowcaseClient />;
}
