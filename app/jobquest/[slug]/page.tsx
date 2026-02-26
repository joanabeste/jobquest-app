'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { questStorage, companyStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';
import { FunnelDoc } from '@/lib/funnel-types';
import { JobQuest, Company } from '@/lib/types';
import QuestPlayer from '@/components/quest/QuestPlayer';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';

export default function PublicQuestPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quest, setQuest] = useState<JobQuest | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [funnelDoc, setFunnelDoc] = useState<FunnelDoc | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const found = questStorage.getBySlug(slug);
    if (!found) { setNotFound(true); return; }
    const comp = companyStorage.getById(found.companyId);
    if (!comp) { setNotFound(true); return; }
    setQuest(found);
    setCompany(comp);
    // Check if a FunnelDoc exists for this quest
    setFunnelDoc(funnelStorage.getByContentId(found.id) ?? null);
  }, [slug]);

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

  // If a FunnelDoc exists, render it with FunnelPlayer; otherwise fall back to legacy QuestPlayer
  if (funnelDoc) {
    return <FunnelPlayer doc={funnelDoc} company={company} contentDbId={quest.id} />;
  }

  return <QuestPlayer quest={quest} company={company} />;
}
