'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import {
  QuestModule, SceneModule, DialogModule, DecisionModule, QuizModule,
  InfoModule, FreetextModule, ImageModule, VideoModule, AudioModule, FileModule, DialogLine,
} from '@/lib/types';

export default function ModuleRenderer({
  module, answers, setAnswers, showFeedback, setShowFeedback, dialogStep, setDialogStep, onDecisionSelect,
}: {
  module: QuestModule;
  answers: Record<string, string | null>;
  setAnswers: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void;
  showFeedback: Record<string, boolean>;
  setShowFeedback: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  dialogStep: Record<string, number>;
  setDialogStep: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  onDecisionSelect: (m: DecisionModule, optionId: string) => void;
}) {
  switch (module.type) {
    case 'scene': return <SceneRenderer module={module as SceneModule} />;
    case 'dialog': return (
      <DialogRenderer
        module={module as DialogModule}
        step={dialogStep[module.id] ?? 0}
        setStep={(s) => setDialogStep((p) => ({ ...p, [module.id]: s }))}
        answers={answers}
        setAnswers={setAnswers}
      />
    );
    case 'decision': return (
      <DecisionRenderer
        module={module as DecisionModule}
        selected={answers[module.id] ?? null}
        onSelect={(id) => onDecisionSelect(module as DecisionModule, id)}
        showFeedback={showFeedback[module.id]}
      />
    );
    case 'quiz': return (
      <QuizRenderer
        module={module as QuizModule}
        selected={answers[module.id] ?? null}
        onSelect={(id) => { setAnswers((p) => ({ ...p, [module.id]: id })); setShowFeedback((p) => ({ ...p, [module.id]: true })); }}
        showFeedback={showFeedback[module.id]}
      />
    );
    case 'info': return <InfoRenderer module={module as InfoModule} />;
    case 'freetext': return <FreetextRenderer module={module as FreetextModule} />;
    case 'image': return <ImageRenderer module={module as ImageModule} />;
    case 'video': return <VideoRenderer module={module as VideoModule} />;
    case 'audio': return <AudioRenderer module={module as AudioModule} />;
    case 'file': return <FileRenderer module={module as FileModule} />;
    default: return null;
  }
}

function SceneRenderer({ module: m }: { module: SceneModule }) {
  return (
    <div className="space-y-4">
      {m.imageUrl && (
        <img src={m.imageUrl} alt={m.title} className="w-full h-48 object-cover rounded-2xl shadow-md" />
      )}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌄</span>
          <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Szene</span>
        </div>
        <h2 className="quest-heading text-xl font-bold mb-3">{m.title}</h2>
        <p className="text-slate-600 leading-relaxed">{m.description}</p>
      </div>
    </div>
  );
}

function DialogRenderer({ module: m, step, setStep, answers, setAnswers }: {
  module: DialogModule;
  step: number;
  setStep: (s: number) => void;
  answers: Record<string, string | null>;
  setAnswers: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void;
}) {
  const lines = m.lines;
  const visibleLines = lines.slice(0, step + 1);

  return (
    <div className="space-y-3">
      {m.title && (
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h2 className="quest-heading text-lg font-bold">{m.title}</h2>
        </div>
      )}
      <div className="space-y-3 min-h-[200px]">
        {visibleLines.map((line: DialogLine, i) => {
          const isRight = i % 2 === 1;
          const displayName = line.speaker;
          const displayIcon = line.speaker?.charAt(0) || '?';
          return (
            <div key={line.id} className={`flex gap-3 ${isRight ? 'flex-row-reverse' : ''}`}>
              <div className="quest-dialog-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-auto">
                {displayIcon}
              </div>
              <div className="max-w-[78%]">
                <p className={`text-xs font-medium mb-1 ${isRight ? 'text-right' : ''} text-slate-400`}>{displayName}</p>
                <div className={isRight ? 'chat-bubble-right' : 'chat-bubble-left'}>
                  <p className="text-sm leading-relaxed">{line.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="label">Deine Antwort</label>
        <textarea
          className="input-field w-full min-h-[80px]"
          placeholder="Schreibe hier deine Antwort..."
          value={answers[m.id] ?? ''}
          onChange={(e) => setAnswers((p) => ({ ...p, [m.id]: e.target.value }))}
        />
      </div>

      {step < lines.length - 1 && (
        <button
          onClick={() => setStep(step + 1)}
          className="quest-dialog-more w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium transition-all"
        >
          Weiter lesen →
        </button>
      )}
    </div>
  );
}

function DecisionRenderer({ module: m, selected, onSelect, showFeedback }: {
  module: DecisionModule; selected: string | null; onSelect: (id: string) => void; showFeedback?: boolean;
}) {
  const selectedOption = m.options.find((o) => o.id === selected);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔀</span>
        <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Entscheidung</span>
      </div>
      <div className="card p-5">
        <p className="quest-heading text-lg font-semibold mb-4">{m.question}</p>
        <div className="space-y-2.5">
          {m.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => !selected && onSelect(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                selected === opt.id
                  ? 'quest-option-selected'
                  : selected
                  ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-default'
                  : 'quest-option-default border-slate-200 text-slate-700 cursor-pointer'
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>
        {showFeedback && selectedOption && (
          <div className="quest-decision-feedback mt-4 border rounded-xl p-4 text-sm">
            {selectedOption.reaction}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRenderer({ module: m, selected, onSelect, showFeedback }: {
  module: QuizModule; selected: string | null; onSelect: (id: string) => void; showFeedback?: boolean;
}) {
  const selectedOption = m.options.find((o) => o.id === selected);
  const correctOption = m.options.find((o) => o.correct);
  const isCorrect = selectedOption?.correct === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">❓</span>
        <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Quiz</span>
      </div>
      <div className="card p-5">
        <p className="quest-heading text-lg font-semibold mb-4">{m.question}</p>
        <div className="space-y-2.5">
          {m.options.map((opt) => {
            let style = 'quest-option-default border-slate-200 text-slate-700 cursor-pointer';
            if (selected) {
              if (opt.id === selected) {
                style = opt.correct
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-red-400 bg-red-50 text-red-800';
              } else if (opt.correct) {
                style = 'border-green-300 bg-green-50 text-green-700';
              } else {
                style = 'border-slate-100 bg-slate-50 text-slate-400 cursor-default';
              }
            }
            return (
              <button
                key={opt.id}
                onClick={() => !selected && onSelect(opt.id)}
                className={`w-full text-left p-4 rounded-xl border-2 text-sm font-medium transition-all ${style}`}
              >
                <div className="flex items-center gap-2">
                  {selected && opt.correct && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                  {selected && opt.id === selected && !opt.correct && <AlertCircle size={16} className="text-red-500 flex-shrink-0" />}
                  {opt.text}
                </div>
              </button>
            );
          })}
        </div>

        {showFeedback && selectedOption && (
          <div className={`mt-5 rounded-2xl overflow-hidden border-2 ${isCorrect ? 'border-green-300' : 'border-red-300'}`}>
            <div className={`flex items-center gap-3 px-4 py-3 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
              <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
              <div>
                <p className="text-white font-bold text-base leading-tight">
                  {isCorrect ? 'Richtig!' : 'Leider falsch!'}
                </p>
                {!isCorrect && correctOption && (
                  <p className="text-white/80 text-xs mt-0.5">
                    Richtig wäre: <span className="font-semibold text-white">{correctOption.text}</span>
                  </p>
                )}
              </div>
            </div>
            {(isCorrect ? selectedOption.feedback : correctOption?.feedback) && (
              <div className={`px-4 py-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  Warum?
                </p>
                <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? selectedOption.feedback : correctOption?.feedback}
                </p>
              </div>
            )}
            {!isCorrect && selectedOption.feedback && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Deine Antwort</p>
                <p className="text-sm text-slate-600 leading-relaxed">{selectedOption.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRenderer({ module: m }: { module: InfoModule }) {
  return (
    <div className="space-y-4">
      {m.imageUrl && <img src={m.imageUrl} alt={m.title} className="w-full h-40 object-cover rounded-2xl shadow-md" />}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">ℹ️</span>
          <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Info</span>
        </div>
        <h2 className="quest-heading text-xl font-bold mb-3">{m.title}</h2>
        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{m.text}</p>
        {m.videoUrl && (
          <div className="mt-4">
            <a href={m.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              ▶ Video ansehen
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FreetextRenderer({ module: m }: { module: FreetextModule }) {
  return (
    <div className="card p-6">
      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{m.text}</p>
    </div>
  );
}

function ImageRenderer({ module: m }: { module: ImageModule }) {
  return (
    <div className="space-y-2">
      <img src={m.imageUrl} alt={m.caption || ''} className="w-full rounded-2xl shadow-md" />
      {m.caption && <p className="text-sm text-slate-500 text-center">{m.caption}</p>}
    </div>
  );
}

function VideoRenderer({ module: m }: { module: VideoModule }) {
  function getEmbedUrl(url: string): string {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  }
  const embedUrl = getEmbedUrl(m.videoUrl);
  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-2xl overflow-hidden shadow-md bg-black">
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
      </div>
      {m.caption && <p className="text-sm text-slate-500 text-center">{m.caption}</p>}
    </div>
  );
}

function AudioRenderer({ module: m }: { module: AudioModule }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎧</span>
        <p className="font-semibold text-slate-900">{m.title || 'Audio'}</p>
      </div>
      <audio controls className="w-full" src={m.audioUrl} />
    </div>
  );
}

function FileRenderer({ module: m }: { module: FileModule }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className="quest-icon-tint w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{m.filename}</p>
          {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
        </div>
        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm flex-shrink-0" download={m.filename}>
          Download
        </a>
      </div>
    </div>
  );
}
