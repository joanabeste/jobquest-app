'use client';

import { JobQuest, QuestModule, SceneModule, DialogModule, DecisionModule, QuizModule, InfoModule, FreetextModule, ImageModule, VideoModule, AudioModule, FileModule, CorporateDesign, DEFAULT_CORPORATE_DESIGN } from '@/lib/types';
import { MODULE_LABELS } from '@/lib/types';

interface Props {
  quest: JobQuest;
  singleModule?: QuestModule | null;
  onFieldClick?: (name: string) => void;
  design?: CorporateDesign;
}

export default function EditorPreview({ quest, singleModule, onFieldClick, design }: Props) {
  const cd = design ?? DEFAULT_CORPORATE_DESIGN;
  const primary = cd.primaryColor;
  const br = `${cd.borderRadius ?? 12}px`;
  const headingColor = cd.headingColor;

  return (
    <div className="max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 h-6 flex items-center justify-center">
          <div className="w-16 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Branded header */}
        <div className="px-4 py-3" style={{ backgroundColor: primary }}>
          <h2 className="text-white font-semibold text-sm truncate">{quest.title || 'Deine JobQuest'}</h2>
          <div className="mt-2 rounded-full h-1" style={{ backgroundColor: primary + '66' }}>
            <div className="rounded-full h-1 w-1/3 bg-white/80" />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px] scrollbar-thin">
          {singleModule ? (
            <PreviewModule module={singleModule} onFieldClick={onFieldClick} primary={primary} br={br} headingColor={headingColor} />
          ) : quest.modules.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Noch keine Module hinzugefügt.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quest.modules.map((m) => (
                <PreviewModule key={m.id} module={m} primary={primary} br={br} headingColor={headingColor} />
              ))}
              {/* Lead Form Preview */}
              <div className="p-4 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>📋 Abschluss</p>
                <div className="space-y-2">
                  <div className="bg-white border border-slate-200 px-3 py-2 text-xs text-slate-400" style={{ borderRadius: br }}>Vorname</div>
                  <div className="bg-white border border-slate-200 px-3 py-2 text-xs text-slate-400" style={{ borderRadius: br }}>Nachname</div>
                  <div className="bg-white border border-slate-200 px-3 py-2 text-xs text-slate-400" style={{ borderRadius: br }}>E-Mail</div>
                  <div className="px-3 py-2 text-xs text-white text-center font-medium" style={{ backgroundColor: primary, borderRadius: br }}>
                    Jetzt bewerben →
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const clickBase = 'transition-all cursor-text px-1 -mx-1';

function PreviewModule({ module, onFieldClick, primary, br, headingColor }: {
  module: QuestModule;
  onFieldClick?: (name: string) => void;
  primary: string;
  br: string;
  headingColor: string;
}) {
  const cl = onFieldClick
    ? `${clickBase} rounded hover:outline hover:outline-2 hover:outline-offset-1`
    : '';
  const clStyle = onFieldClick ? { outlineColor: primary + '88' } : {};

  switch (module.type) {
    case 'scene': {
      const m = module as SceneModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🌄 Szene</span>
          {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 w-full h-24 object-cover rounded-lg" onError={() => {}} />}
          <h3
            onClick={() => onFieldClick?.('title')}
            className={`font-semibold mt-2 text-sm ${cl}`}
            style={{ color: headingColor, ...clStyle }}
          >
            {m.title || '—'}
          </h3>
          <p
            onClick={() => onFieldClick?.('description')}
            className={`text-slate-600 text-xs mt-1 line-clamp-3 ${cl}`}
            style={clStyle}
          >
            {m.description || '—'}
          </p>
        </div>
      );
    }
    case 'dialog': {
      const m = module as DialogModule;
      return (
        <div className="p-4 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">💬 Dialog</span>
          {/* player avatars removed */}
          {m.lines.map((line, i) => (
            <div key={line.id} className={`flex gap-2 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: i % 2 === 1 ? primary : undefined, background: i % 2 === 0 ? '#e2e8f0' : undefined }}>
                <span style={{ color: i % 2 === 0 ? '#475569' : 'white' }}>{line.speaker?.charAt(0) || '?'}</span>
              </div>
              <div className={`rounded-xl px-3 py-1.5 text-xs max-w-[75%] ${i % 2 === 1 ? 'text-white' : 'bg-slate-100 text-slate-700'}`}
                style={i % 2 === 1 ? { backgroundColor: primary } : {}}>
                {line.text || '…'}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'decision': {
      const m = module as DecisionModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🔀 Entscheidung</span>
          <p
            onClick={() => onFieldClick?.('question')}
            className={`text-sm font-medium mt-1 ${cl}`}
            style={{ color: headingColor, ...clStyle }}
          >
            {m.question || '—'}
          </p>
          <div className="mt-2 space-y-1.5">
            {m.options.slice(0, 3).map((opt) => (
              <div key={opt.id} className="border border-slate-200 px-3 py-2 text-xs text-slate-600 bg-white" style={{ borderRadius: br }}>
                {opt.text || '—'}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'quiz': {
      const m = module as QuizModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">❓ Quiz</span>
          <p
            onClick={() => onFieldClick?.('question')}
            className={`text-sm font-medium mt-1 ${cl}`}
            style={{ color: headingColor, ...clStyle }}
          >
            {m.question || '—'}
          </p>
          <div className="mt-2 space-y-1.5">
            {m.options.slice(0, 3).map((opt) => (
              <div key={opt.id} className="border px-3 py-2 text-xs" style={{
                borderRadius: br,
                borderColor: opt.correct ? primary + '88' : '#e2e8f0',
                backgroundColor: opt.correct ? primary + '12' : 'white',
                color: opt.correct ? primary : '#475569',
              }}>
                {opt.text || '—'}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'info': {
      const m = module as InfoModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ℹ️ Info</span>
          <h3
            onClick={() => onFieldClick?.('title')}
            className={`font-semibold mt-1 text-sm ${cl}`}
            style={{ color: headingColor, ...clStyle }}
          >
            {m.title || '—'}
          </h3>
          <p
            onClick={() => onFieldClick?.('text')}
            className={`text-slate-600 text-xs mt-1 line-clamp-3 ${cl}`}
            style={clStyle}
          >
            {m.text || '—'}
          </p>
        </div>
      );
    }
    case 'freetext': {
      const m = module as FreetextModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">📝 Text</span>
          <p
            onClick={() => onFieldClick?.('text')}
            className={`text-slate-700 text-xs mt-1 line-clamp-4 ${cl}`}
            style={clStyle}
          >
            {m.text || '—'}
          </p>
        </div>
      );
    }
    case 'image': {
      const m = module as ImageModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🖼️ Bild</span>
          {m.imageUrl ? (
            <img src={m.imageUrl} alt={m.caption || ''} className="mt-2 w-full h-28 object-cover" style={{ borderRadius: br }} />
          ) : (
            <div className="mt-2 w-full h-20 bg-slate-100 flex items-center justify-center text-slate-300 text-xs" style={{ borderRadius: br }}>Kein Bild</div>
          )}
          {m.caption && (
            <p onClick={() => onFieldClick?.('caption')} className={`text-xs text-slate-500 mt-1 ${cl}`} style={clStyle}>
              {m.caption}
            </p>
          )}
        </div>
      );
    }
    case 'video': {
      const m = module as VideoModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🎬 Video</span>
          <div className="mt-2 w-full h-20 bg-slate-100 flex items-center justify-center text-slate-400 text-sm" style={{ borderRadius: br }}>
            ▶ Video
          </div>
          {m.caption && (
            <p onClick={() => onFieldClick?.('caption')} className={`text-xs text-slate-500 mt-1 ${cl}`} style={clStyle}>
              {m.caption}
            </p>
          )}
        </div>
      );
    }
    case 'audio': {
      const m = module as AudioModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🎧 Audio</span>
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primary }}>
              <span className="text-white text-xs">▶</span>
            </div>
            <p onClick={() => onFieldClick?.('title')} className={`text-xs text-slate-600 truncate ${cl}`} style={clStyle}>
              {m.title || 'Audio'}
            </p>
          </div>
        </div>
      );
    }
    case 'file': {
      const m = module as FileModule;
      return (
        <div className="p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">📎 Datei</span>
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <span className="text-xl">📄</span>
            <div>
              <p onClick={() => onFieldClick?.('filename')} className={`text-xs font-medium text-slate-700 ${cl}`} style={clStyle}>
                {m.filename || 'Datei'}
              </p>
              {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
            </div>
          </div>
        </div>
      );
    }
    default:
      return (
        <div className="p-4">
          <span className="text-xs text-slate-400">{MODULE_LABELS[(module as QuestModule).type]}</span>
        </div>
      );
  }
}
