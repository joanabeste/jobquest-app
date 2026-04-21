'use client';

import { useState, useEffect } from 'react';
import { Trophy, Video, FileText, Send, ExternalLink, ChevronDown, X } from 'lucide-react';

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
  /**
   * Maximum theoretically achievable score per dimension across the whole
   * funnel. If provided, bars are normalised per-dimension against this max
   * (100% = user gave the most dimension-favourable answer to every question).
   * If omitted, falls back to global max across all dims.
   */
  maxScores?: Record<string, number>;
  answers: Record<string, unknown>;
  primary: string;
  /** Button background from corporate design — used for active tab pills so they match CD buttons. */
  buttonBg?: string;
  /** Button text colour from corporate design — contrast on coloured tab pills. */
  buttonText?: string;
  br: string;
  onNext?: () => void;
  continueLabel?: string;
}

const ICONS = { video: Video, doc: FileText, apply: Send, link: ExternalLink } as const;

export default function ErgebnisBlock({
  headline, subtext, layout, showDimensionBars, groups, dimensions, scores, maxScores, answers, primary, buttonBg, buttonText, br,
  onNext, continueLabel,
}: Props) {
  // Tab-pill colouring: mirror the CD button so the label contrast stays correct
  // when the user picks a light primary (yellow/white).
  const pillBg = buttonBg || primary;
  const pillText = buttonText || '#ffffff';
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
    <div className="fp-card bg-white shadow-sm mx-4 my-5 p-5 sm:p-8 md:p-10">
      <div className="text-center md:max-w-2xl md:mx-auto">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${primary}20` }}>
          <Trophy size={28} style={{ color: primary }} />
        </div>
        <h2 className="fp-heading text-2xl md:text-3xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(headline)) }} />
        {b(subtext) && <div className="text-slate-500 text-sm md:text-base mb-6 rte" dangerouslySetInnerHTML={{ __html: sh(subtext) }} />}
      </div>

      {layout === 'groups' && visibleGroups.length === 0 && groups.length > 0 && (
        <p className="text-sm text-slate-500 text-center mt-3">
          Für deine Antworten gibt es leider keine passende Empfehlung.
        </p>
      )}

      {useGroups ? (
        <>
          {/* ── Mobile: accordion with all categories visible + percentage + click to expand ── */}
          <div className="md:hidden">
            <MobileAccordion
              groups={visibleGroups}
              dimensions={dimensions}
              scores={scores}
              maxScores={maxScores}
              primary={primary}
              br={br}
            />
          </div>

          {/* ── Desktop: tabs + bars + 3-col suggestions grid ── */}
          <div className="hidden md:block">
            {visibleGroups.length > 1 && (
              <div className="pb-2 mb-4">
                <div className="flex gap-2 flex-wrap justify-center">
                  {visibleGroups.map((g, i) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveTab(i)}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                      style={i === activeTab
                        ? { background: pillBg, color: pillText }
                        : { background: '#f1f5f9', color: '#64748b' }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const g = visibleGroups[Math.min(activeTab, visibleGroups.length - 1)];
              if (!g) return null;
              return (
                <div key={g.id}>
                  <GroupBars group={g} dimensions={dimensions} scores={scores} maxScores={maxScores} primary={primary} />
                  <GroupSuggestions group={g} dimensions={dimensions} scores={scores} primary={primary} br={br} />
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        showDimensionBars && (
          <SimpleBars dimensions={dimensions} scores={scores} maxScores={maxScores} primary={primary} />
        )
      )}

      {onNext && (
        <button
          onClick={() => onNext()}
          className="fp-btn w-full md:w-auto md:min-w-[16rem] md:mx-auto md:block mt-6 py-3 md:py-3.5 md:px-10 font-semibold text-sm"
          style={{ borderRadius: br }}
        >
          {continueLabel || 'Weiter'}
        </button>
      )}
    </div>
  );
}

function pctFor(score: number, dimId: string, maxScores?: Record<string, number>, fallbackMax = 1): number {
  const dimMax = maxScores?.[dimId];
  const divisor = typeof dimMax === 'number' && dimMax > 0 ? dimMax : fallbackMax;
  return Math.max(0, Math.min(100, Math.round((score / divisor) * 100)));
}

function SimpleBars({ dimensions, scores, maxScores, primary }: { dimensions: Dimension[]; scores: Record<string, number>; maxScores?: Record<string, number>; primary: string }) {
  const globalMax = Math.max(...Object.values(scores), 1);
  if (dimensions.length === 0) {
    const total = Object.values(scores).reduce((a, v) => a + v, 0);
    if (total === 0) return null;
    return <p className="text-sm text-slate-500 text-center mt-3">Du hast {total} Punkte erreicht.</p>;
  }
  return (
    <div className="space-y-4 mt-4 md:max-w-2xl md:mx-auto">
      {dimensions.map((dim, i) => {
        const score = scores[dim.id] ?? 0;
        const pct = pctFor(score, dim.id, maxScores, globalMax);
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

// Mobile result view: all categories stacked as an accordion. Each row shows
// the label + percentage + progress bar; tapping expands to a compact list of
// matching Berufe with small thumbnails (or initial-badge fallback). Top-match
// category is opened by default.
function MobileAccordion({ groups, dimensions, scores, maxScores, primary, br }: {
  groups: ErgebnisGroup[];
  dimensions: Dimension[];
  scores: Record<string, number>;
  maxScores?: Record<string, number>;
  primary: string;
  br: string;
}) {
  // Aggregate score per group = sum of its dimension scores. Max analogously.
  const ranked = groups.map((g) => {
    const groupScore = g.dimensionIds.reduce((a, id) => a + (scores[id] ?? 0), 0);
    const groupMax = g.dimensionIds.reduce((a, id) => a + (maxScores?.[id] ?? 0), 0);
    const pct = groupMax > 0 ? Math.round((groupScore / groupMax) * 100) : 0;
    return { group: g, pct };
  }).sort((a, b) => b.pct - a.pct);

  const topId = ranked[0]?.group.id;
  const [openId, setOpenId] = useState<string | null>(topId ?? null);
  const [modalSug, setModalSug] = useState<ErgebnisSuggestion | null>(null);

  useEffect(() => {
    if (!modalSug) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalSug(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalSug]);

  return (
    <>
      <div className="space-y-2 mt-2">
        {ranked.map(({ group: g, pct }) => {
          const isOpen = openId === g.id;
          // Determine top-N dims for this group to filter suggestions.
          const topN = Math.max(1, g.topN ?? 3);
          const sorted = g.dimensionIds
            .filter((id) => dimensions.some((d) => d.id === id))
            .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
          const top = new Set(sorted.slice(0, topN));
          const matching = g.suggestions.filter((sug) => {
            if (!sug.requiresDimensionIds || sug.requiresDimensionIds.length === 0) return true;
            return sug.requiresDimensionIds.every((d) => top.has(d));
          });

          return (
            <div
              key={g.id}
              className="border border-slate-200 bg-white overflow-hidden transition-colors"
              style={{ borderRadius: br, ...(isOpen ? { borderColor: primary + '55' } : {}) }}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : g.id)}
                className="w-full px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-1 text-sm font-semibold text-slate-900">{g.label}</span>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: primary }}>{pct}%</span>
                  <ChevronDown
                    size={16}
                    className="text-slate-400 flex-shrink-0 transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%`, background: primary }}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-2 py-2 space-y-1">
                  {matching.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">Keine passenden Treffer in dieser Kategorie.</p>
                  ) : (
                    matching.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => setModalSug(sug)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                      >
                        {sug.imageUrl ? (
                          <img src={sug.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: primary + '15', color: primary }}
                          >
                            {sug.title.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">{sug.title}</p>
                          {sug.description && (
                            <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">{sug.description}</p>
                          )}
                        </div>
                        <ChevronDown size={14} className="flex-shrink-0 text-slate-300 -rotate-90" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalSug && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalSug(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full sm:max-w-lg max-h-[88vh] min-h-[55vh] sm:min-h-0 overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
            style={{
              borderRadius: br,
              paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-shrink-0">
              {modalSug.imageUrl ? (
                <img src={modalSug.imageUrl} alt="" className="w-full aspect-[16/9] object-cover" />
              ) : (
                <div
                  className="w-full aspect-[16/9] flex items-center justify-center text-5xl font-bold"
                  style={{ background: primary + '15', color: primary }}
                >
                  {modalSug.title.charAt(0)}
                </div>
              )}
              <button
                type="button"
                onClick={() => setModalSug(null)}
                aria-label="Schließen"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-md text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Content: flex-col + justify-center lets short descriptions float
                toward the middle of the min-height instead of hugging the top. */}
            <div className="p-5 pb-6 flex-1 flex flex-col justify-center">
              <h3 className="fp-heading text-xl font-bold mb-3">{modalSug.title}</h3>
              {modalSug.description && (
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{modalSug.description}</p>
              )}
              {modalSug.links && modalSug.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {modalSug.links.map((l) => {
                    const Icon = ICONS[l.icon ?? 'link'];
                    return (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border hover:bg-slate-50 transition-colors"
                        style={{ borderRadius: br, borderColor: primary + '40', color: primary }}
                      >
                        <Icon size={14} /> {l.label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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

function GroupBars({ group, dimensions, scores, maxScores, primary }: { group: ErgebnisGroup; dimensions: Dimension[]; scores: Record<string, number>; maxScores?: Record<string, number>; primary: string }) {
  if (!group.showBars) return null;
  const groupDims = dimensions.filter((d) => group.dimensionIds.includes(d.id));
  // Fallback when no per-dimension max is available: use the highest score seen.
  const globalMax = Math.max(...dimensions.map((d) => scores[d.id] ?? 0), 1);
  if (groupDims.length === 0) return null;
  // Grid adapts: 1 bar → full width, 2 → 2 cols, ≥3 → 3 cols on desktop.
  const cols = groupDims.length === 1 ? 'md:grid-cols-1'
    : groupDims.length === 2 ? 'md:grid-cols-2'
    : 'md:grid-cols-3';
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3 md:gap-6 mb-6 md:mb-8`}>
      {groupDims.map((dim, i) => {
        const score = scores[dim.id] ?? 0;
        const pct = pctFor(score, dim.id, maxScores, globalMax);
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

  const [openSug, setOpenSug] = useState<ErgebnisSuggestion | null>(null);

  // Close modal on Escape
  useEffect(() => {
    if (!openSug) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenSug(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSug]);

  if (matching.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-2">
        {matching.map((sug) => (
          <button
            key={sug.id}
            type="button"
            onClick={() => setOpenSug(sug)}
            className="group text-left border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ borderRadius: br }}
          >
            {sug.imageUrl ? (
              <img src={sug.imageUrl} alt="" className="w-full aspect-[16/10] object-cover" />
            ) : (
              <div
                className="w-full aspect-[16/10] flex items-center justify-center text-3xl font-bold"
                style={{ background: primary + '12', color: primary }}
              >
                {sug.title.charAt(0)}
              </div>
            )}
            <div className="p-3 md:p-4">
              <p className="text-sm md:text-base font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">
                {sug.title}
              </p>
              {sug.description && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{sug.description}</p>
              )}
              <span
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium group-hover:gap-1.5 transition-all"
                style={{ color: primary }}
              >
                Mehr erfahren <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {openSug && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
          onClick={() => setOpenSug(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            style={{ borderRadius: br }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenSug(null)}
              aria-label="Schließen"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow-md text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            <div className="relative">
              {openSug.imageUrl ? (
                <img src={openSug.imageUrl} alt="" className="w-full aspect-[16/9] object-cover" />
              ) : (
                <div
                  className="w-full aspect-[16/9] flex items-center justify-center text-5xl font-bold"
                  style={{ background: primary + '15', color: primary }}
                >
                  {openSug.title.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-5 md:p-7">
              <h3 className="fp-heading text-xl md:text-2xl font-bold mb-3">{openSug.title}</h3>
              {openSug.description && (
                <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">{openSug.description}</p>
              )}
              {openSug.links && openSug.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {openSug.links.map((l) => {
                    const Icon = ICONS[l.icon ?? 'link'];
                    return (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border hover:bg-slate-50 transition-colors"
                        style={{ borderRadius: br, borderColor: primary + '40', color: primary }}
                      >
                        <Icon size={14} /> {l.label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
