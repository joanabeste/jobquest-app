import type { Metadata } from 'next';
import { loadPublishedContentWithCompany } from '@/lib/load-public-company';
import PublicFormClient from './PublicFormClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Identischer Select in generateMetadata + Page → React cache() dedupt die Query.
const FORM_SELECT = 'title, company_id';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('form_pages', slug, FORM_SELECT);

  if (!data) return { title: 'Formular nicht gefunden' };
  const formTitle = data.row.title as string;
  if (!data.company) return { title: formTitle };

  const company = data.company;
  const title = `${formTitle} – ${company.name}`;
  const description = `${formTitle} von ${company.name}`;

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

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('form_pages', slug, FORM_SELECT);
  const co = data?.company;
  return <PublicFormClient brand={{ logo: co?.logo, primary: co?.corporateDesign?.primaryColor }} />;
}
