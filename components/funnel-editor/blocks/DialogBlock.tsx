'use client';

import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { applyVars } from '@/lib/funnel-variables';
import type { SpeakerOverride } from '@/lib/funnel-types';

export interface DialogLine { id: string; speaker: string; text: string; imageUrl?: string; avatarUrl?: string; position?: 'left' | 'right' | 'center'; }
interface DialogChoice { id: string; text: string; reaction?: string; }
interface DialogInput { placeholder?: string; captures?: string; followUpText?: string; }

// ─── Avatar (photo when avatarUrl is set, otherwise initial in primary-color circle) ───
function Avatar({ speaker, primary, avatarUrl }: { speaker: string; primary: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <div className="w-10 h-10 rounded-full flex-shrink-0 mt-auto overflow-hidden bg-slate-200">
        <img src={avatarUrl} alt={speaker || ''} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex-shrink-0 mt-auto overflow-hidden flex items-center justify-center font-bold text-white text-base"
      style={{ background: primary }}
    >
      <span>{speaker?.charAt(0)?.toUpperCase() || '?'}</span>
    </div>
  );
}

// ─── Typing indicator (three bouncing dots) ───────────────────────────────────
function TypingIndicator({ primary, avatarUrl, speaker }: { primary: string; avatarUrl?: string; speaker?: string }) {
  return (
    <div className="flex gap-3 px-5">
      {avatarUrl ? (
        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-slate-200">
          <img src={avatarUrl} alt={speaker || ''} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: `${primary}30` }} />
      )}
      <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Dialog block – reveals bubbles one by one with typing animation ──────────
export default function DialogBlock({ lines, primary, visibleCount, onAdvance, firstName, choices, input, nodeId, onAnswer, onSetFirstName, onCapture, capturedVars, answers, br, inputInFooter, speakerOverrides }: {
  lines: DialogLine[];
  primary: string;
  visibleCount: number;
  onAdvance: (count: number) => void;
  firstName: string;
  choices?: DialogChoice[];
  input?: DialogInput;
  nodeId?: string;
  onAnswer?: (id: string, val: unknown) => void;
  onSetFirstName?: (v: string) => void;
  onCapture?: (varName: string, value: string) => void;
  capturedVars?: Record<string, string>;
  answers?: Record<string, unknown>;
  br?: string;
  inputInFooter?: boolean;
  speakerOverrides?: Record<string, SpeakerOverride>;
}) {
  const [typing, setTyping] = useState(false);

  const hasChoices = !!choices && choices.length > 0;
  const selectedChoiceId = hasChoices && nodeId && answers ? answers[nodeId] as string | undefined : undefined;
  const selectedChoice = selectedChoiceId ? choices?.find((c) => c.id === selectedChoiceId) : undefined;
  // Start as true if already answered (back-navigation), false if fresh
  const [choiceReactionVisible, setChoiceReactionVisible] = useState(!!selectedChoiceId);

  // Input field state
  const hasInput = !!input;
  const existingInputAnswer = hasInput && nodeId && answers ? (answers[nodeId] as string | undefined) : undefined;
  const [inputValue, setInputValue] = useState(existingInputAnswer ?? '');
  const [inputSubmitted, setInputSubmitted] = useState(!!existingInputAnswer);
  const [inputFollowUpVisible, setInputFollowUpVisible] = useState(!!existingInputAnswer && !!input?.followUpText);

  // Sync inputSubmitted from external answer (footer input)
  useEffect(() => {
    if (existingInputAnswer && !inputSubmitted) {
      setInputValue(existingInputAnswer);
      setInputSubmitted(true);
      if (input?.followUpText) setTimeout(() => setInputFollowUpVisible(true), 1000);
    }
  }, [existingInputAnswer, inputSubmitted, input?.followUpText]);

  function handleInputSubmit() {
    const val = inputValue.trim();
    if (!val) return;
    if (input?.captures) {
      if ((input.captures === 'firstName' || input.captures === 'vorname') && onSetFirstName) onSetFirstName(val);
      if (onCapture) onCapture(input.captures, val);
    }
    if (nodeId && onAnswer) onAnswer(nodeId, val);
    setInputSubmitted(true);
    if (input?.followUpText) {
      setTimeout(() => setInputFollowUpVisible(true), 1000);
    }
  }

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    // Show typing indicator, then reveal next bubble
    setTyping(true);
    const delay = lines[visibleCount]?.text?.length > 60 ? 1200 : 850;
    const t = setTimeout(() => {
      setTyping(false);
      onAdvance(visibleCount + 1);
    }, delay);
    return () => clearTimeout(t);
  // onAdvance is stable (defined inline in parent, but we only want this to run on visibleCount changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, lines.length]);

  // Show reaction bubble after a choice is picked
  useEffect(() => {
    if (!selectedChoiceId || !selectedChoice?.reaction || choiceReactionVisible) return;
    const t = setTimeout(() => setChoiceReactionVisible(true), 1200);
    return () => clearTimeout(t);
  }, [selectedChoiceId, selectedChoice?.reaction, choiceReactionVisible]);

  if (lines.length === 0 && !hasChoices && !hasInput) return null;

  const visible = lines.slice(0, visibleCount);
  const allLinesShown = visibleCount >= lines.length;
  const showChoiceButtons = allLinesShown && hasChoices && !selectedChoiceId;
  const showChoiceTyping = !!selectedChoiceId && !!selectedChoice?.reaction && !choiceReactionVisible;
  const followUpSpeaker = lines.filter(l => l.position !== 'right').at(-1) ?? lines[0];

  // Resolve avatar for a given speaker name: prefer the line's own avatarUrl,
  // then the global speaker-override avatar (set via Sprecher-Sektion im
  // DialogEditor), then reuse the most recent matching speaker's avatar in the
  // same block as a Block-internal fallback.
  function avatarFor(speaker: string, ownAvatar?: string): string | undefined {
    if (ownAvatar) return ownAvatar;
    if (!speaker) return undefined;
    const override = speakerOverrides?.[speaker]?.avatarUrl;
    if (override) return override;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].speaker === speaker && lines[i].avatarUrl) return lines[i].avatarUrl;
    }
    return undefined;
  }

  // Resolve display name for a given speaker string: global override wins,
  // otherwise the original string from the Line.
  function displayNameFor(speaker: string): string {
    const override = speakerOverrides?.[speaker]?.displayName?.trim();
    return override || speaker;
  }

  return (
    <div className="py-4 space-y-3">
      {visible.map((line, idx) => {
        const isRight = line.position === 'right';
        const isCenter = line.position === 'center';

        if (isCenter) {
          return (
            <div
              key={line.id}
              className="px-8 py-1"
              style={{ animation: idx === visibleCount - 1 ? 'fadeSlideIn 0.3s ease-out' : undefined }}
            >
              <p className="text-xs italic text-slate-400 text-center leading-relaxed">{line.text}</p>
            </div>
          );
        }

        const lineAvatar = avatarFor(line.speaker, line.avatarUrl);
        const lineDisplay = displayNameFor(line.speaker);
        return (
          <div
            key={line.id}
            className={`flex gap-3 px-5 ${isRight ? 'flex-row-reverse' : ''}`}
            style={{ animation: idx === visibleCount - 1 ? 'fadeSlideIn 0.3s ease-out' : undefined }}
          >
            <Avatar speaker={lineDisplay} primary={primary} avatarUrl={lineAvatar} />
            <div className={`max-w-[78%] ${isRight ? 'items-end' : ''} flex flex-col`}>
              <p className="text-[13px] font-medium text-slate-600 mb-1">{isRight && firstName ? firstName : lineDisplay}</p>
              {!!line.imageUrl && (

                <img src={line.imageUrl} alt="" className="w-full rounded-2xl mb-1.5 max-h-44 object-cover shadow-sm" />
              )}
              {!!line.text && (
                <div className={`px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed ${isRight ? 'text-white' : 'bg-slate-100 text-slate-700'}`}
                  style={isRight ? { background: primary } : {}}>
                  {line.text}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator for auto-advancing main lines */}
      {!allLinesShown && typing && (
        <TypingIndicator
          primary={primary}
          avatarUrl={avatarFor(lines[visibleCount]?.speaker ?? '', lines[visibleCount]?.avatarUrl)}
          speaker={lines[visibleCount]?.speaker}
        />
      )}

      {/* User's selected choice shown as right bubble */}
      {selectedChoice && (
        <div className="flex gap-3 px-5 flex-row-reverse" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <Avatar speaker={firstName || 'I'} primary={primary} />
          <div className="max-w-[78%] items-end flex flex-col">
            <p className="text-[13px] font-medium text-slate-600 mb-1">{firstName || 'Ich'}</p>
            <div className="px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed text-white" style={{ background: primary }}>
              {selectedChoice.text}
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator while waiting for reaction */}
      {showChoiceTyping && (
        <TypingIndicator
          primary={primary}
          avatarUrl={avatarFor(followUpSpeaker?.speaker ?? '', followUpSpeaker?.avatarUrl)}
          speaker={followUpSpeaker?.speaker}
        />
      )}

      {/* Reaction bubble after choice */}
      {choiceReactionVisible && selectedChoice?.reaction && (
        <div className="flex gap-3 px-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <Avatar
            speaker={displayNameFor(followUpSpeaker?.speaker ?? '')}
            primary={primary}
            avatarUrl={avatarFor(followUpSpeaker?.speaker ?? '', followUpSpeaker?.avatarUrl)}
          />
          <div className="max-w-[78%] flex flex-col">
            <p className="text-[13px] font-medium text-slate-600 mb-1">{followUpSpeaker?.speaker ? displayNameFor(followUpSpeaker.speaker) : 'Sprecher'}</p>
            <div className="bg-slate-100 px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed text-slate-700">
              {selectedChoice.reaction}
            </div>
          </div>
        </div>
      )}

      {/* Choice buttons – appear after all lines are revealed */}
      {showChoiceButtons && (
        <div className="px-5 pt-2 space-y-2">
          <p className="text-xs text-slate-500 text-center mb-1">Deine Antwort:</p>
          {choices!.map((c) => (
            <button
              key={c.id}
              onClick={() => { if (nodeId && onAnswer) onAnswer(nodeId, c.id); }}
              className="w-full text-left px-4 py-3 text-[15px] rounded-2xl border-2 transition-all hover:shadow-sm active:scale-[0.98] font-medium"
              style={{ borderColor: primary, color: primary, background: `${primary}08`, borderRadius: br ?? '12px' }}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {/* Input field – appears after all lines are revealed (hidden when rendered in footer) */}
      {allLinesShown && hasInput && !inputSubmitted && !inputInFooter && (
        <div className="px-5 pt-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
              placeholder={input?.placeholder ?? 'Deine Antwort…'}
              className="flex-1 px-4 py-2.5 text-sm rounded-2xl border-2 bg-white outline-none transition-colors focus:border-ci"
              style={{ borderColor: `${primary}40`, fontSize: '16px' }}
              name={input?.captures === 'vorname' || input?.captures === 'firstName' ? 'given-name' : 'response'}
              autoComplete={input?.captures === 'vorname' || input?.captures === 'firstName' ? 'given-name' : 'off'}
              autoCapitalize={input?.captures === 'vorname' || input?.captures === 'firstName' ? 'words' : 'sentences'}
              autoCorrect="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              autoFocus
            />
            <button
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
              style={{ background: primary }}
            >
              <ArrowRight size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* User's typed input shown as right bubble */}
      {inputSubmitted && (
        <div className="flex gap-3 px-5 flex-row-reverse" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <Avatar speaker={firstName || inputValue || 'I'} primary={primary} />
          <div className="max-w-[78%] items-end flex flex-col">
            <p className="text-[13px] font-medium text-slate-600 mb-1">{firstName || 'Ich'}</p>
            <div className="px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed text-white" style={{ background: primary }}>
              {existingInputAnswer ?? inputValue}
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator while waiting for follow-up after input */}
      {inputSubmitted && !!input?.followUpText && !inputFollowUpVisible && (
        <TypingIndicator
          primary={primary}
          avatarUrl={avatarFor(followUpSpeaker?.speaker ?? '', followUpSpeaker?.avatarUrl)}
          speaker={followUpSpeaker?.speaker}
        />
      )}

      {/* Follow-up bubble after input submission */}
      {inputFollowUpVisible && input?.followUpText && (
        <div className="flex gap-3 px-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <Avatar
            speaker={displayNameFor(followUpSpeaker?.speaker ?? '')}
            primary={primary}
            avatarUrl={avatarFor(followUpSpeaker?.speaker ?? '', followUpSpeaker?.avatarUrl)}
          />
          <div className="max-w-[78%] flex flex-col">
            <p className="text-[13px] font-medium text-slate-600 mb-1">{followUpSpeaker?.speaker ? displayNameFor(followUpSpeaker.speaker) : 'Sprecher'}</p>
            <div className="bg-slate-100 px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed text-slate-700">
              {applyVars(input.followUpText, {
                ...(capturedVars ?? {}),
                firstName: firstName || '',
                ...(input.captures && inputValue ? { [input.captures]: inputValue.trim() } : {}),
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
