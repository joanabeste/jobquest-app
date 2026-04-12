'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { questStorage, companyStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';
import { FunnelDoc } from '@/lib/funnel-types';
import { JobQuest, Company } from '@/lib/types';
import QuestPlayer from '@/components/quest/QuestPlayer';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';
import { useSlugRedirect } from '@/lib/use-slug-redirect';

export default function PublicQuestClient() {
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

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-slate-900">Quest nicht gefunden</h1>
        <p className="text-slate-500 text-sm">Diese JobQuest existiert nicht oder wurde noch nicht veröffentlicht.</p>
      </div>
    );
  }

  if (!quest || !company || funnelDoc === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <p className="text-slate-400 text-sm">Laden…</p>
        </div>
      </div>
    );
  }

  if (funnelDoc) {
    return <FunnelPlayer doc={funnelDoc} company={company} contentDbId={quest.id} />;
  }

  return <QuestPlayer quest={quest} company={company} />;
}
