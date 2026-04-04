'use client';

import { MousePointer2 } from 'lucide-react';
import { BerufsCheckBlock, Dimension } from '@/lib/types';

const clickEl = 'rounded cursor-text transition-all hover:ring-2 hover:ring-violet-300 hover:ring-offset-1';

function PreviewHint() {
  return (
    <p className="mt-3 text-[10px] text-violet-400 flex items-center gap-1 opacity-60">
      <MousePointer2 size={10} /> Klicken zum Bearbeiten
    </p>
  );
}

export function BlockPreview({ block, dimensions, company, focusField }: {
  block: BerufsCheckBlock;
  dimensions: Dimension[];
  company: string;
  focusField: (name: string) => void;
}) {
  switch (block.type) {
    case 'intro': return (
      <div className="relative min-h-[240px] flex items-center justify-center text-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600">
        {block.imageUrl && (
           
          <img src={block.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative z-10 px-8 py-10 w-full">
          <h1 onClick={() => focusField('headline')} className={`text-2xl font-bold text-white mb-3 ${clickEl}`}>
            {block.headline || <span className="opacity-40 italic">Überschrift…</span>}
          </h1>
          <p onClick={() => focusField('subtext')} className={`text-white/80 text-sm mb-6 leading-relaxed ${clickEl}`}>
            {block.subtext || <span className="opacity-40 italic">Untertext…</span>}
          </p>
          <span onClick={() => focusField('buttonText')}
            className={`inline-block px-6 py-2.5 bg-white rounded-xl text-violet-700 font-semibold text-sm ${clickEl}`}>
            {block.buttonText || 'Button'}
          </span>
        </div>
        <PreviewHint />
      </div>
    );

    case 'vorname': return (
      <div className="bg-white rounded-2xl p-8">
        <p onClick={() => focusField('question')} className={`text-lg font-semibold text-slate-900 mb-6 min-h-[1em] ${clickEl}`}>
          {block.question || <span className="text-slate-300 italic">Frage…</span>}
        </p>
        <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center px-3 mb-4">
          <span className="text-slate-300 text-sm">{block.placeholder || 'Dein Vorname'}</span>
        </div>
        <span onClick={() => focusField('buttonText')}
          className={`inline-block px-5 py-2 bg-violet-600 rounded-xl text-white text-sm font-semibold ${clickEl}`}>
          {block.buttonText || 'Weiter'}
        </span>
        <PreviewHint />
      </div>
    );

    case 'selbsteinschaetzung': return (
      <div className="bg-white rounded-2xl p-8">
        <p onClick={() => focusField('question')} className={`text-lg font-semibold text-slate-900 mb-2 min-h-[1em] ${clickEl}`}>
          {block.question || <span className="text-slate-300 italic">Frage…</span>}
        </p>
        {block.description && (
          <p onClick={() => focusField('description')} className={`text-sm text-slate-500 mb-4 ${clickEl}`}>{block.description}</p>
        )}
        <div className="mt-6">
          <div className="relative h-2 bg-slate-100 rounded-full">
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-violet-600 shadow-md" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{block.sliderLabelMin || 'Gar nicht'}</span>
            <span>{block.sliderLabelMax || 'Sehr stark'}</span>
          </div>
        </div>
        <PreviewHint />
      </div>
    );

    case 'frage': return (
      <div className="bg-white rounded-2xl p-8">
        <p onClick={() => focusField('question')} className={`text-lg font-semibold text-slate-900 mb-5 min-h-[1em] ${clickEl}`}>
          {block.question || <span className="text-slate-300 italic">Frage…</span>}
        </p>
        {block.frageType === 'single_choice' ? (
          <div className="space-y-2">
            {(block.options ?? []).slice(0, 4).map((opt, i) => (
              <div key={opt.id} className="p-3 rounded-xl border-2 border-slate-200 text-sm text-slate-700">
                {opt.text || `Option ${i + 1}`}
              </div>
            ))}
            {(block.options ?? []).length === 0 && <p className="text-slate-300 text-sm italic">Noch keine Optionen</p>}
          </div>
        ) : (
          <div className="mt-4">
            <div className="relative h-2 bg-slate-100 rounded-full">
              <div className="absolute left-1/3 -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-violet-600 shadow-md" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>{block.sliderLabelMin || 'Wenig'}</span>
              <span>{block.sliderLabelMax || 'Viel'}</span>
            </div>
          </div>
        )}
        <PreviewHint />
      </div>
    );

    case 'ergebnisfrage': return (
      <div className="bg-white rounded-2xl p-8">
        <p onClick={() => focusField('question')} className={`text-lg font-semibold text-slate-900 mb-2 min-h-[1em] ${clickEl}`}>
          {block.question || <span className="text-slate-300 italic">Frage…</span>}
        </p>
        {block.description && (
          <p onClick={() => focusField('description')} className={`text-sm text-slate-500 mb-5 ${clickEl}`}>{block.description}</p>
        )}
        <div className="space-y-2 mt-4">
          {block.options.slice(0, 3).map((opt, i) => (
            <div key={opt.id} className="p-3 rounded-xl border-2 border-slate-200 text-sm text-slate-700">
              {opt.text || `Option ${i + 1}`}
            </div>
          ))}
        </div>
        <PreviewHint />
      </div>
    );

    case 'text': return (
      <div className="bg-white rounded-2xl p-8">
        {(block.headline !== undefined) && (
          <h2 onClick={() => focusField('headline')} className={`text-xl font-bold text-slate-900 mb-3 min-h-[1em] ${clickEl}`}>
            {block.headline || <span className="text-slate-300 italic">Überschrift (optional)…</span>}
          </h2>
        )}
        <p onClick={() => focusField('content')} className={`text-slate-600 text-sm leading-relaxed whitespace-pre-wrap min-h-[2em] ${clickEl}`}>
          {block.content || <span className="text-slate-300 italic">Text hier…</span>}
        </p>
        {block.buttonText && (
          <span onClick={() => focusField('buttonText')}
            className={`mt-5 inline-block px-5 py-2 bg-violet-600 rounded-xl text-white text-sm font-semibold ${clickEl}`}>
            {block.buttonText}
          </span>
        )}
        <PreviewHint />
      </div>
    );

    case 'lead': return (
      <div className="bg-white rounded-2xl p-8">
        <h2 onClick={() => focusField('headline')} className={`text-xl font-bold text-slate-900 mb-2 min-h-[1em] ${clickEl}`}>
          {block.headline || <span className="text-slate-300 italic">Überschrift…</span>}
        </h2>
        <p onClick={() => focusField('subtext')} className={`text-slate-500 text-sm mb-6 min-h-[1em] ${clickEl}`}>
          {block.subtext || <span className="text-slate-300 italic">Untertext…</span>}
        </p>
        <div className="space-y-2.5 mb-4">
          <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center px-3"><span className="text-slate-300 text-sm">Vorname</span></div>
          <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center px-3"><span className="text-slate-300 text-sm">E-Mail-Adresse *</span></div>
          {block.showPhone && <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center px-3"><span className="text-slate-300 text-sm">Telefonnummer</span></div>}
        </div>
        <p onClick={() => focusField('privacyText')} className={`text-xs text-slate-400 mb-4 leading-relaxed ${clickEl}`}>
          {block.privacyText.replace('{{company}}', company || 'Unternehmen')}
        </p>
        <span onClick={() => focusField('buttonText')}
          className={`block w-full py-2.5 bg-violet-600 rounded-xl text-white text-sm font-semibold text-center ${clickEl}`}>
          {block.buttonText || 'Ergebnis anzeigen'}
        </span>
        <PreviewHint />
      </div>
    );

    case 'ergebnis': return (
      <div className="bg-white rounded-2xl p-8">
        <h2 onClick={() => focusField('headline')} className={`text-xl font-bold text-slate-900 mb-2 min-h-[1em] ${clickEl}`}>
          {block.headline.replace('{{name}}', 'Max').replace('@firstName', 'Max') || <span className="text-slate-300 italic">Überschrift…</span>}
        </h2>
        <p onClick={() => focusField('subtext')} className={`text-slate-500 text-sm mb-6 min-h-[1em] ${clickEl}`}>
          {block.subtext || <span className="text-slate-300 italic">Untertext…</span>}
        </p>
        {block.showDimensionBars && (
          <div className="space-y-3">
            {(dimensions.length > 0 ? dimensions : [
              { id: '1', name: 'Berufsfeld A', color: '#7c3aed' },
              { id: '2', name: 'Berufsfeld B', color: '#3b82f6' },
            ]).slice(0, 4).map((dim, i) => (
              <div key={dim.id}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{dim.name}</span>
                  <span>{Math.round(75 - i * 15)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${75 - i * 15}%`, backgroundColor: dim.color ?? '#7c3aed' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <PreviewHint />
      </div>
    );

    case 'button': return (
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
        <span onClick={() => focusField('text')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold ${
            block.style === 'primary' ? 'bg-violet-600 text-white' : 'border-2 border-slate-300 text-slate-700'
          } ${clickEl}`}>
          {block.text || <span className="italic opacity-50">Button-Text…</span>}
        </span>
        {block.url && (
          <p onClick={() => focusField('url')} className={`text-xs text-slate-400 font-mono ${clickEl}`}>{block.url}</p>
        )}
        <PreviewHint />
      </div>
    );
  }
}
