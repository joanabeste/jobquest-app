'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { DECISION_ICONS, EMOJI_GROUPS, isIconName } from '@/lib/decision-icons';

type Tab = 'icons' | 'emoji';

export function IconEmojiPicker({ value, onChange, onClose }: {
  value?: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(isIconName(value) ? 'icons' : 'emoji');

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-72">
      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setTab('icons')}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${tab === 'icons' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Lucide Icons
        </button>
        <button
          type="button"
          onClick={() => setTab('emoji')}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${tab === 'emoji' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Emojis
        </button>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50">
          <X size={12} />
        </button>
      </div>

      {tab === 'icons' && (
        <div className="max-h-52 overflow-y-auto">
          <div className="grid grid-cols-9 gap-0.5">
            {/* Clear */}
            <button
              type="button"
              onClick={() => { onChange(''); onClose(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-100 border border-dashed border-slate-200"
              title="Kein Icon"
            >
              <X size={10} />
            </button>
            {Object.entries(DECISION_ICONS).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(name); onClose(); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-violet-50 transition-colors ${value === name ? 'bg-violet-100 text-violet-600' : 'text-slate-500'}`}
                title={name}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'emoji' && (
        <div className="max-h-52 overflow-y-auto space-y-2">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-0.5">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => { onChange(em); onClose(); }}
                    className={`w-7 h-7 text-base flex items-center justify-center rounded-lg hover:bg-violet-50 transition-colors ${value === em ? 'bg-violet-100' : ''}`}
                    title={em}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
