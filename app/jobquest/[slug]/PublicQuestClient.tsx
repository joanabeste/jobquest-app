'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { questStorage, companyStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';
import { FunnelDoc } from '@/lib/funnel-types';
import { JobQuest, Company } from '@/lib/types';
import QuestPlayer from '@/components/quest/QuestPlayer';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';
import { BrandedLoadingScreen } from '@/components/BrandedLoadingScreen';
import { useSlugRedirect } from '@/lib/use-slug-redirect';

interface PublicQuestProps {
  /** Serverseitig vorab gereichte Marken-Infos für den Ladescreen (Logo + CI). */
  brand?: { logo?: string; primary?: string };
}

export default function PublicQuestClient({ brand }: PublicQuestProps = {}) {
  const { slug } = useParams<{ slug: string }>();
  const [quest, setQuest] = useState<JobQuest | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [funnelDoc, setFunnelDoc] = useState<FunnelDoc | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const redirecting = useSlugRedirect(slug, 'job_quest', '/jobquest', notFound);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const found = await questStorage.getBySlug(slug);
      if (!found) { setNotFound(true); return; }
      const comp = await companyStorage.getById(found.companyId);
      if (!comp) { setNotFound(true); return; }
      setQuest(found);
      setCompany(comp);
      const fd = await funnelStorage.getByContentId(found.id);
      setFunnelDoc(fd ?? null);
    }
    load();
  }, [slug]);

  const loadingScreen = (
    <BrandedLoadingScreen
      logoUrl={company?.logo ?? brand?.logo}
      accentColor={company?.corporateDesign?.primaryColor ?? brand?.primary}
    />
  );

  if (redirecting) return loadingScreen;

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-slate-900">Quest nicht gefunden</h1>
        <p className="text-slate-500 text-sm">Diese JobQuest existiert nicht oder wurde noch nicht veröffentlicht.</p>
      </div>
    );
  }

  if (!quest || !company || funnelDoc === undefined) return loadingScreen;

  if (funnelDoc) {
    return <FunnelPlayer doc={funnelDoc} company={company} contentDbId={quest.id} />;
  }

  return <QuestPlayer quest={quest} company={company} />;
}
