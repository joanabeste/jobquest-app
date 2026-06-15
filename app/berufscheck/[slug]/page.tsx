import type { Metadata } from 'next';
import { loadPublishedContentWithCompany } from '@/lib/load-public-company';
import PublicCheckClient from './PublicCheckClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Identischer Select in generateMetadata + Page → React cache() dedupt die Query.
const CHECK_SELECT = 'title, company_id';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('career_checks', slug, CHECK_SELECT);

  if (!data) return { title: 'Berufscheck nicht gefunden' };
  const checkTitle = data.row.title as string;
  if (!data.company) return { title: checkTitle };

  const company = data.company;
  const title = `${checkTitle} – ${company.name}`;
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

export default async function PublicCheckPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('career_checks', slug, CHECK_SELECT);
  const co = data?.company;
  return <PublicCheckClient brand={{ logo: co?.logo, primary: co?.corporateDesign?.primaryColor }} />;
}
