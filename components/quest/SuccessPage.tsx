'use client';

import { Check, ExternalLink, ChevronRight } from 'lucide-react';
import { Company, SuccessPageConfig, DEFAULT_SUCCESS_PAGE } from '@/lib/types';

interface FeaturedQuest {
  id: string;
  title: string;
  slug: string;
  logo?: string;
}

interface Props {
  company: Company;
  primary: string;
  br: string;
  featuredQuests?: FeaturedQuest[];
}

export default function SuccessPage({ company, primary, br, featuredQuests = [] }: Props) {
  const cfg: SuccessPageConfig = { ...DEFAULT_SUCCESS_PAGE, ...company.successPage };

  return (
    <div className="flex flex-col items-center px-4 py-10 gap-8 max-w-lg mx-auto w-full">

      {/* ── Bestätigung ─────────────────────────────────────────────────── */}
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5 mx-auto"
          style={{ background: `${primary}20` }}
        >
          <Check size={38} style={{ color: primary }} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">{cfg.headline}</h2>
        {cfg.text && <p className="text-slate-500 text-base leading-relaxed">{cfg.text}</p>}
      </div>

      {/* ── CTA-Links ───────────────────────────────────────────────────── */}
      {cfg.links.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          {cfg.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 font-semibold text-sm text-white"
              style={{ borderRadius: br, background: primary }}
            >
              {link.label} <ExternalLink size={14} />
            </a>
          ))}
        </div>
      )}

      {/* ── Ausbildungsberufe ───────────────────────────────────────────── */}
      {cfg.showJobs && cfg.jobs.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{cfg.jobsHeadline}</h3>
          <div className="flex flex-col gap-2">
            {cfg.jobs.map((job) =>
              job.url ? (
                <a
                  key={job.id}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
                  style={{ borderRadius: br }}
                >
                  {job.title}
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-600" />
                </a>
              ) : (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800"
                  style={{ borderRadius: br }}
                >
                  {job.title}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ── Weitere Quests ──────────────────────────────────────────────── */}
      {cfg.showQuests && featuredQuests.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{cfg.questsHeadline}</h3>
          <div className="flex flex-col gap-2">
            {featuredQuests.map((q) => (
              <a
                key={q.id}
                href={`/jobquest/${q.slug}`}
                className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
                style={{ borderRadius: br }}
              >
                {q.logo || company.logo ? (
                  <img src={q.logo ?? company.logo} alt="" className="h-8 w-auto max-w-[100px] rounded object-contain flex-shrink-0" />
                ) : (
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: primary }}
                  >
                    {q.title.charAt(0)}
                  </div>
                )}
                <span className="flex-1 text-sm font-medium text-slate-800">{q.title}</span>
                <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Firmen-Branding ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-slate-400 text-xs mt-2">
        {company.logo ? (
          <img src={company.logo} alt="" className="h-5 w-auto max-w-[80px] rounded object-contain" />
        ) : (
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: primary }}
          >
            {company.name.charAt(0)}
          </div>
        )}
        <span>{company.name}</span>
      </div>

      {/* ── Datenschutz/Impressum ───────────────────────────────────────── */}
      {(company.privacyUrl || company.imprintUrl) && (
        <div className="flex gap-4 text-xs text-slate-400">
          {company.privacyUrl && (
            <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Datenschutz</a>
          )}
          {company.imprintUrl && (
            <a href={company.imprintUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Impressum</a>
          )}
        </div>
      )}
    </div>
  );
}
