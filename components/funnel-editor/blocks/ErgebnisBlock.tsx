'use client';

import { useState, useEffect } from 'react';
import { Trophy, Video, FileText, Send, ExternalLink, ChevronDown } from 'lucide-react';

/** Hook: starts at 0, animates to target after a delay */
function useAnimatedValue(target: number, delay = 300, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const step = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay, duration]);
  return value;
}
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
  onNext?: () => void;
  continueLabel?: string;
}

const ICONS = { video: Video, doc: FileText, apply: Send, link: ExternalLink } as const;

export default function ErgebnisBlock({
  headline, subtext, layout, showDimensionBars, groups, dimensions, scores, answers, primary, br,
  onNext, continueLabel,
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
    <div className="fp-card bg-white shadow-sm mx-4 my-5 p-5 sm:p-8">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${primary}20` }}>
        <Trophy size={28} style={{ color: primary }} />
      </div>
      <h2 className="fp-heading text-2xl font-bold mb-2 text-center" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(headline)) }} />
      {b(subtext) && <div className="text-slate-500 text-sm mb-6 text-center rte" dangerouslySetInnerHTML={{ __html: sh(subtext) }} />}

      {layout === 'groups' && visibleGroups.length === 0 && groups.length > 0 && (
        <p className="text-sm text-slate-500 text-center mt-3">
          Für deine Antworten gibt es leider keine passende Empfehlung.
        </p>
      )}

      {useGroups ? (
        <>
          {/* Tab bar — same on mobile and desktop */}
          {visibleGroups.length > 1 && (
            <div className="overflow-x-auto -mx-2 px-2 pb-2 mb-4">
              <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                {visibleGroups.map((g, i) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                    style={i === activeTab
                      ? { background: primary, color: '#fff' }
                      : { background: '#f1f5f9', color: '#64748b' }}
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

      {onNext && (
        <button
          onClick={() => onNext()}
          className="fp-btn w-full mt-6 py-3 font-semibold text-sm"
          style={{ borderRadius: br, background: primary, color: '#fff' }}
        >
          {continueLabel || 'Weiter'}
        </button>
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
      {dimensions.map((dim, i) => {
        const score = scores[dim.id] ?? 0;
        const pct = Math.min(100, Math.round((score / max) * 100));
        return (
          <div key={dim.id}>
            <AnimatedBar name={dim.name} pct={pct} color={dim.color || primary} delay={300 + i * 150} />
            {dim.description && <p className="text-xs text-slate-400 mt-1">{dim.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

function AnimatedBar({ name, pct, color, delay }: { name: string; pct: number; color: string; delay: number }) {
  const animPct = useAnimatedValue(pct, delay, 900);
  return (
    <div>
      <p className="text-xs font-medium text-slate-700 mb-1">{name}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${animPct}%`, background: color }} />
        </div>
        <span className="text-xs font-bold w-8 text-right" style={{ color }}>{animPct}%</span>
      </div>
    </div>
  );
}

function GroupBars({ group, dimensions, scores, primary }: { group: ErgebnisGroup; dimensions: Dimension[]; scores: Record<string, number>; primary: string }) {
  if (!group.showBars) return null;
  const groupDims = dimensions.filter((d) => group.dimensionIds.includes(d.id));
  // Max across ALL dimensions (not just this group) so bars are relative to overall scores
  const max = Math.max(...dimensions.map((d) => scores[d.id] ?? 0), 1);
  if (groupDims.length === 0) return null;
  return (
    <div className="space-y-3 mb-4">
      {groupDims.map((dim, i) => {
        const score = scores[dim.id] ?? 0;
        const pct = Math.min(100, Math.round((score / max) * 100));
        return <AnimatedBar key={dim.id} name={dim.name} pct={pct} color={dim.color || primary} delay={300 + i * 150} />;
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
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{ background: primary + '15', color: primary }}
                >
                  {sug.title.charAt(0)}
                </div>
              )}
              <p className="flex-1 text-sm font-semibold text-slate-900 min-w-0 leading-snug">{sug.title}</p>
              <ChevronDown
                size={16}
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
