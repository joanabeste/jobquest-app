'use client';

import { useState } from 'react';
import { MapPin, Check } from 'lucide-react';
import { DECISION_ICONS, isIconName } from '@/lib/decision-icons';

export default function HotspotBlock({ imageUrl, hotspots, requireAll, doneText, primary, br, nodeId, answers, onAnswer, onNext }: {
  imageUrl: string;
  hotspots: { id: string; x: number; y: number; label: string; description: string; icon?: string }[];
  requireAll: boolean;
  doneText: string;
  primary: string;
  br: string;
  nodeId: string;
  answers: Record<string, unknown>;
  onAnswer: (id: string, val: unknown) => void;
  onNext: () => void;
}) {
  const discovered = new Set<string>(((answers[nodeId] as string[] | undefined) ?? []));
  const [activeId, setActiveId] = useState<string | null>(null);

  function discover(id: string) {
    const next = new Set(discovered);
    next.add(id);
    onAnswer(nodeId, Array.from(next));
    setActiveId(id);
  }

  const activeSpot = hotspots.find((h) => h.id === activeId);
  const allFound = hotspots.length > 0 && discovered.size >= hotspots.length;
  const canContinue = !requireAll || allFound;

  if (!imageUrl) {
    return (
      <div className="mx-4 my-3 flex flex-col items-center justify-center gap-2 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
        <MapPin size={24} />
        <span className="text-sm">Kein Bild hochgeladen</span>
      </div>
    );
  }

  return (
    <div className="mx-4 my-3 space-y-3">
      {/* Image with hotspot pins */}
      <div className="relative overflow-hidden rounded-xl" style={{ borderRadius: br }}>
        <img src={imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: 320, display: 'block' }} />

        {hotspots.map((h) => {
          const isFound = discovered.has(h.id);
          const isActive = activeId === h.id;
          const IconComp = isIconName(h.icon) ? DECISION_ICONS[h.icon] : null;
          return (
            <button
              key={h.id}
              onClick={() => discover(h.id)}
              className="absolute focus:outline-none"
              style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}
              title={h.label}
            >
              {/* Pulse ring — only for undiscovered */}
              {!isFound && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-60"
                  style={{ background: primary }}
                />
              )}
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-full shadow-lg transition-all duration-200"
                style={{
                  background: isFound ? primary : '#fff',
                  border: `2.5px solid ${primary}`,
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {isFound
                  ? <Check size={16} className="text-white" />
                  : IconComp
                    ? <IconComp size={16} style={{ color: primary }} />
                    : <MapPin size={15} style={{ color: primary }} />
                }
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress indicator */}
      {hotspots.length > 1 && (
        <p className="text-xs text-slate-400 text-center">
          {discovered.size} / {hotspots.length} entdeckt
        </p>
      )}

      {/* Active hotspot info panel */}
      {activeSpot && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3.5 flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${primary}20` }}
            >
              {isIconName(activeSpot.icon)
                ? (() => { const Ic = DECISION_ICONS[activeSpot.icon!]; return <Ic size={16} style={{ color: primary }} />; })()
                : <MapPin size={14} style={{ color: primary }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">{activeSpot.label}</p>
              {activeSpot.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{activeSpot.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Continue button */}
      {canContinue && (
        <button
          onClick={onNext}
          className="w-full fp-btn py-3 font-semibold text-sm flex items-center justify-center gap-2"
          style={{ borderRadius: br }}
        >
          {doneText}
          {/* ArrowRight imported inline to avoid adding to main bundle */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      )}

      {/* Hint when requireAll and not all found yet */}
      {requireAll && !allFound && hotspots.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Entdecke alle {hotspots.length} Punkte um fortzufahren
        </p>
      )}
    </div>
  );
}
