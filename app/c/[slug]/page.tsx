'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { companyStorage, questStorage, careerCheckStorage } from '@/lib/storage';
import { Company, JobQuest, CareerCheck } from '@/lib/types';
import { useCorporateDesign } from '@/lib/use-corporate-design';
import { useFavicon } from '@/lib/use-favicon';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';

interface ResolvedItem {
  id: string;
  type: 'jobquest' | 'berufscheck';
  title: string;
  href: string;
  cardImage?: string;
}

export default function ShowcasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;
      const comp = await companyStorage.getBySlug(slug);
      if (!comp || !comp.showcase?.enabled) { setNotFound(true); return; }
      if (cancelled) return;
      setCompany(comp);

      const [quests, checks] = await Promise.all([
        questStorage.getByCompany(comp.id).catch(() => [] as JobQuest[]),
        careerCheckStorage.getByCompany(comp.id).catch(() => [] as CareerCheck[]),
      ]);
      if (cancelled) return;

      const qById = new Map(quests.map((q) => [q.id, q]));
      const cById = new Map(checks.map((c) => [c.id, c]));
      const resolved: ResolvedItem[] = [];
      for (const it of comp.showcase.items) {
        if (it.type === 'jobquest') {
          const q = qById.get(it.contentId);
          if (q && q.status === 'published') {
            resolved.push({
              id: it.id, type: 'jobquest', title: q.title,
              href: `/jobquest/${q.slug}`, cardImage: q.cardImage,
            });
          }
        } else {
          const c = cById.get(it.contentId);
          if (c && c.status === 'published') {
            resolved.push({
              id: it.id, type: 'berufscheck', title: c.title,
              href: `/berufscheck/${c.slug}`, cardImage: c.cardImage,
            });
          }
        }
      }
      setItems(resolved);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const questItems = useMemo(() => items.filter((it) => it.type === 'jobquest'), [items]);
  const checkItems = useMemo(() => items.filter((it) => it.type === 'berufscheck'), [items]);

  // Hook expects a non-null Company; pass an empty stub when not loaded yet.
  const design = useCorporateDesign(company ?? ({ corporateDesign: undefined } as Company));
  useFavicon(company?.corporateDesign?.faviconUrl);

  const cssVars = useMemo(() => ({
    '--showcase-primary': design.primary,
    '--showcase-radius': design.br,
  } as React.CSSProperties), [design]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-slate-900">Übersicht nicht gefunden</h1>
        <p className="text-slate-500 text-sm">Diese Seite existiert nicht oder ist nicht öffentlich.</p>
      </div>
    );
  }
  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
        </header>
        <section className="max-w-5xl mx-auto px-4 md:px-6 pt-10 pb-6 text-center space-y-3">
          <div className="h-8 sm:h-10 w-3/4 max-w-md mx-auto rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-2/3 max-w-sm mx-auto rounded bg-slate-200 animate-pulse" />
        </section>
        <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="aspect-[16/10] bg-slate-100 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                  <div className="h-5 w-3/4 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const sc = company.showcase!;
  const headline = sc.headline || `Willkommen bei ${company.name}`;

  return (
    <div className="min-h-screen bg-slate-50" style={cssVars}>
      {design.css && <style>{design.css}</style>}

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex items-center gap-4">
          {company.logo ? (

            <img src={company.logo} alt={company.name}
              className="h-12 w-auto max-w-[180px] object-contain flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: design.primary }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Karriere</p>
            <h1 className="text-lg font-semibold text-slate-900 truncate">{company.name}</h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pt-10 pb-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{headline}</h2>
        {sc.subtext && (
          <p className="text-slate-500 text-base mt-3 max-w-2xl mx-auto">{sc.subtext}</p>
        )}
      </section>

      {/* Sections */}
      {items.length === 0 ? (
        <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16">
          <div className="text-center py-16 text-slate-400 text-sm">
            Aktuell sind keine Inhalte verfügbar.
          </div>
        </section>
      ) : (
        <>
          {questItems.length > 0 && (
            <ShowcaseSection
              kind="jobquest"
              items={questItems}
              headline={sc.questsHeadline || 'JobQuests'}
              subtext={sc.questsSubtext}
            />
          )}
          {checkItems.length > 0 && (
            <ShowcaseSection
              kind="berufscheck"
              items={checkItems}
              headline={sc.checksHeadline || 'Berufschecks'}
              subtext={sc.checksSubtext}
            />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 text-center text-xs text-slate-400">
          {company.name}
          {company.imprintUrl && (
            <> · <a href={company.imprintUrl} target="_blank" rel="noreferrer" className="hover:text-slate-600">Impressum</a></>
          )}
          {company.privacyUrl && (
            <> · <a href={company.privacyUrl} target="_blank" rel="noreferrer" className="hover:text-slate-600">Datenschutz</a></>
          )}
        </div>
      </footer>
    </div>
  );
}

function ShowcaseSection({
  kind, items, headline, subtext,
}: {
  kind: 'jobquest' | 'berufscheck';
  items: ResolvedItem[];
  headline: string;
  subtext?: string;
}) {
  const label = kind === 'jobquest' ? 'JobQuest' : 'Berufscheck';
  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 pb-12">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--showcase-primary)' }}>
          {kind === 'jobquest' ? 'JobQuests' : 'Berufschecks'}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{headline}</h2>
        {subtext && <p className="text-slate-500 text-sm mt-2 max-w-2xl">{subtext}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it) => (
          <Link key={it.id} href={it.href}
            className="group bg-white border border-slate-200 hover:border-violet-400 hover:shadow-lg transition-all overflow-hidden flex flex-col"
            style={{ borderRadius: 'var(--showcase-radius)' }}>
            <div className="aspect-[16/10] bg-slate-100 overflow-hidden flex items-center justify-center">
              {it.cardImage ? (

                <img src={it.cardImage} alt={it.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <ImageIcon size={32} />
                  <span className="text-[10px] uppercase tracking-wide">{label}</span>
                </div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {label}
              </p>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{it.title}</h3>
              <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: 'var(--showcase-primary)' }}>
                Jetzt starten <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
