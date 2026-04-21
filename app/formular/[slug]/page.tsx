import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb } from '@/lib/supabase/mappers';
import PublicFormClient from './PublicFormClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: formRow } = await supabase
    .from('form_pages')
    .select('title, company_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!formRow) return { title: 'Formular nicht gefunden' };

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', formRow.company_id)
    .single();

  if (!companyRow) return { title: formRow.title };

  const company = companyFromDb(companyRow);
  const title = `${formRow.title} – ${company.name}`;
  const description = `${formRow.title} von ${company.name}`;

  const favicon = company.corporateDesign?.faviconUrl;
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon } } : {}),
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

export default function PublicFormPage() {
  return <PublicFormClient />;
}
