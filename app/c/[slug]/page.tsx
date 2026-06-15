import type { Metadata } from 'next';
import { loadCompanyBySlug } from '@/lib/load-public-company';
import ShowcaseClient from './ShowcaseClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await loadCompanyBySlug(slug);

  if (!company) return { title: 'Übersicht nicht gefunden' };
  if (!company.showcase?.enabled) return { title: 'Übersicht nicht gefunden' };

  const title = company.showcase.headline
    ? `${company.showcase.headline} – ${company.name}`
    : `${company.name} – Karriere`;
  const description = company.showcase.subtext
    ?? `Entdecke die offenen Ausbildungen und Berufschecks bei ${company.name}.`;

  const favicon = company.corporateDesign?.faviconUrl ?? company.logo;
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
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

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params;
  const company = await loadCompanyBySlug(slug);
  return <ShowcaseClient brand={{ logo: company?.logo, primary: company?.corporateDesign?.primaryColor }} />;
}
