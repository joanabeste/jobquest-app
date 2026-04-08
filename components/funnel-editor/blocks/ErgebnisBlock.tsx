'use client';

import { useState } from 'react';
import { Trophy, Video, FileText, Send, ExternalLink, ChevronDown } from 'lucide-react';
import { Dimension } from '@/lib/types';
import { sh, b, inlineHtml } from './helpers';

export interface ErgebnisLink {
  id: string;
  label: string;
  url: string;
  icon?: 'video' | 'doc' | 'apply' | 'link';
}

export interface ErgebnisSuggestion {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  /** If set, the suggestion only appears when *every* listed dim is in the group's top-N. */
  requiresDimensionIds?: string[];
  links?: ErgebnisLink[];
}

export interface ErgebnisGroup {
  id: string;
  label: string;
  /** Page-style visibility gate (re-uses the same shape as FunnelPage.visibleIf). */
  visibleIf?: { sourceBlockId: string; equals: string[] };
  /** Which dimensions are scored *into* this group's bars/ranking. */
  dimensionIds: string[];
  showBars: boolean;
  /** How many top dimensions count as "matched" when filtering suggestions. */
  topN?: number;
  suggestions: ErgebnisSuggestion[];
}

interface Props {
  headline: string;
  subtext: string;
  layout: 'simple' | 'groups';
  showDimensionBars: boolean;
  groups: ErgebnisGroup[];
  dimensions: Dimension[];
  scores: Record<string, number>;
  answers: Record<string, unknown>;
  primary: string;
  br: string;
}

const ICONS = { video: Video, doc: FileText, apply: Send, link: ExternalLink } as const;

export default function ErgebnisBlock({
  headline, subtext, layout, showDimensionBars, groups, dimensions, scores, answers, primary, br,
}: Props) {
  // Filter groups whose visibleIf condition is unmet.
  const visibleGroups = groups.filter((g) => {
    if (!g.visibleIf) return true;
    const ans = answers[g.visibleIf.sourceBlockId];
    if (ans === undefined || ans === null) return false;
    return g.visibleIf.equals.includes(String(ans));
  });

  const useGroups = layout === 'groups' && visibleGroups.length > 0;
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
        <Trophy size={28} style={{ color: primary }} />
      </div>
      <h2 className="fp-heading text-2xl font-bold mb-2 text-center" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(headline)) }} />
      {b(subtext) && <div className="text-slate-500 text-sm mb-5 text-center rte" dangerouslySetInnerHTML={{ __html: sh(subtext) }} />}

      {useGroups ? (
        <>
          {/* Tab bar — same on mobile and desktop */}
          {visibleGroups.length > 1 && (
            <div className="flex justify-center mb-5">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                {visibleGroups.map((g, i) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={i === activeTab
                      ? { background: 'white', color: primary, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }
                      : { color: '#64748b', background: 'transparent' }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Active tab content only */}
          {(() => {
            const g = visibleGroups[Math.min(activeTab, visibleGroups.length - 1)];
            if (!g) return null;
            return (
              <div key={g.id}>
                <GroupBars group={g} dimensions={dimensions} scores={scores} primary={primary} />
                <GroupSuggestions group={g} dimensions={dimensions} scores={scores} primary={primary} br={br} />
              </div>
            );
          })()}
        </>
      ) : (
        showDimensionBars && (
          <SimpleBars dimensions={dimensions} scores={scores} primary={primary} />
        )
      )}
    </div>
  );
}

function SimpleBars({ dimensions, scores, primary }: { dimensions: Dimension[]; scores: Record<string, number>; primary: string }) {
  const max = Math.max(...Object.values(scores), 1);
  if (dimensions.length === 0) {
    const total = Object.values(scores).reduce((a, v) => a + v, 0);
    if (total === 0) return null;
    return <p className="text-sm text-slate-500 text-center mt-3">Du hast {total} Punkte erreicht.</p>;
  }
  return (
    <div className="space-y-4 mt-4">
      {dimensions.map((dim) => {
        const score = scores[dim.id] ?? 0;
        const pct = Math.min(100, Math.round((score / max) * 100));
        const barColor = dim.color || primary;
        return (
          <div key={dim.id}>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">{dim.name}</span>
              <span className="text-sm font-bold" style={{ color: barColor }}>{score} Punkte</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            {dim.description && <p className="text-xs text-slate-400 mt-1">{dim.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

function GroupBars({ group, dimensions, scores, primary }: { group: ErgebnisGroup; dimensions: Dimension[]; scores: Record<string, number>; primary: string }) {
  if (!group.showBars) return null;
  const groupDims = dimensions.filter((d) => group.dimensionIds.includes(d.id));
  const max = Math.max(...groupDims.map((d) => scores[d.id] ?? 0), 1);
  if (groupDims.length === 0) return null;
  return (
    <div className="space-y-3 mb-4">
      {groupDims.map((dim) => {
        const score = scores[dim.id] ?? 0;
        const pct = Math.min(100, Math.round((score / max) * 100));
        const c = dim.color || primary;
        return (
          <div key={dim.id}>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">{dim.name}</span>
              <span className="text-xs font-bold" style={{ color: c }}>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c, transition: 'width 700ms ease-out' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupSuggestions({ group, dimensions, scores, primary, br }: { group: ErgebnisGroup; dimensions: Dimension[]; scores: Record<string, number>; primary: string; br: string }) {
  // Determine top-N dimensions within the group.
  const topN = Math.max(1, group.topN ?? 3);
  const sorted = group.dimensionIds
    .filter((id) => dimensions.some((d) => d.id === id))
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const top = new Set(sorted.slice(0, topN));

  const matching = group.suggestions.filter((sug) => {
    if (!sug.requiresDimensionIds || sug.requiresDimensionIds.length === 0) return true;
    return sug.requiresDimensionIds.every((d) => top.has(d));
  });

  // Top-1 starts open, the rest collapsed.
  const [openId, setOpenId] = useState<string | null>(matching[0]?.id ?? null);

  if (matching.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      {matching.map((sug) => {
        const isOpen = openId === sug.id;
        return (
          <div
            key={sug.id}
            className="border border-slate-200 bg-white overflow-hidden transition-all"
            style={{ borderRadius: br, ...(isOpen ? { borderColor: primary + '60' } : {}) }}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : sug.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
              aria-expanded={isOpen}
            >
              {sug.imageUrl ? (
                <img
                  src={sug.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-base font-bold"
                  style={{ background: primary + '15', color: primary }}
                >
                  {sug.title.charAt(0)}
                </div>
              )}
              <p className="flex-1 text-sm font-bold text-slate-900 min-w-0 truncate">{sug.title}</p>
              <ChevronDown
                size={18}
                className="flex-shrink-0 text-slate-400 transition-transform"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                {sug.imageUrl && (
                  <img
                    src={sug.imageUrl}
                    alt=""
                    className="w-full max-h-48 object-cover rounded-lg mt-2 mb-3"
                  />
                )}
                {sug.description && (
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{sug.description}</p>
                )}
                {sug.links && sug.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sug.links.map((l) => {
                      const Icon = ICONS[l.icon ?? 'link'];
                      return (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border hover:bg-slate-50 transition-colors"
                          style={{ borderRadius: br, borderColor: primary + '40', color: primary }}
                        >
                          <Icon size={12} /> {l.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
