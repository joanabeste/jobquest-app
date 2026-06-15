import type { Metadata } from 'next';
import { loadPublishedContentWithCompany } from '@/lib/load-public-company';
import PublicQuestClient from './PublicQuestClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Identischer Select in generateMetadata + Page → React cache() dedupt die Query.
const QUEST_SELECT = 'title, company_id, slug, card_image';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('job_quests', slug, QUEST_SELECT);

  if (!data) {
    return { title: 'JobQuest nicht gefunden' };
  }
  const questRow = data.row as { title: string; card_image?: string | null };

  if (!data.company) {
    return { title: questRow.title };
  }

  const company = data.company;
  const title = `${questRow.title} – ${company.name}`;
  const description = company.description
    ? `Erlebe einen virtuellen Arbeitstag bei ${company.name}. ${company.description.slice(0, 140)}`
    : `Erlebe einen virtuellen Arbeitstag als ${questRow.title} bei ${company.name}.`;

  // Bild-Priorität für Link-Previews (WhatsApp, iMessage, Slack):
  //  1) Quest-eigenes cardImage — meist landscape/portrait, motivisch passend
  //  2) Firmen-Logo als Fallback — meist quadratisch
  // WhatsApp braucht ein absolutes https-URL und rendert kleine Bilder
  // (<300px) gar nicht erst. card_image und company.logo liegen beide im
  // Supabase-Storage und sind bereits absolute https-URLs.
  const cardImage = (questRow.card_image as string | null | undefined) ?? null;
  const hasCardImage = !!cardImage;
  const ogImage = cardImage || company.logo || null;

  const favicon = company.corporateDesign?.faviconUrl ?? company.logo;
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: company.name || 'JobQuest',
      ...(ogImage ? {
        images: [
          hasCardImage
            // Quest-eigenes Bild → landscape-ähnliches Format annehmen, das ist
            // der Standard-Fall für gute Card-Previews.
            ? { url: ogImage, width: 1200, height: 630, alt: title }
            // Fallback Logo → quadratisches Format.
            : { url: ogImage, width: 600, height: 600, alt: company.name },
        ],
      } : {}),
    },
    twitter: {
      // summary_large_image nur wenn ein dediziertes cardImage existiert —
      // bei einem rein quadratischen Logo wirkt large_image gestreckt/leer.
      card: hasCardImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicQuestPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPublishedContentWithCompany('job_quests', slug, QUEST_SELECT);
  const co = data?.company;
  return <PublicQuestClient brand={{ logo: co?.logo, primary: co?.corporateDesign?.primaryColor }} />;
}
