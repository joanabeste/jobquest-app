'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastAPI {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  warning: (msg: string) => void;
  info:    (msg: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION = 4500;
const MAX_TOASTS = 5;

const META: Record<ToastType, { icon: React.ElementType; iconCls: string; bar: string }> = {
  success: { icon: CheckCircle2,  iconCls: 'text-green-500', bar: 'bg-green-500' },
  error:   { icon: AlertCircle,   iconCls: 'text-red-500',   bar: 'bg-red-500'   },
  warning: { icon: AlertTriangle, iconCls: 'text-amber-500', bar: 'bg-amber-500' },
  info:    { icon: Info,          iconCls: 'text-blue-500',  bar: 'bg-blue-500'  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastAPI | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, type, message }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  const api: ToastAPI = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info:    (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast stack — bottom-right, above everything */}
      <div
        aria-live="polite"
        aria-label="Benachrichtigungen"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const { icon: Icon, iconCls, bar } = META[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-toast-in"
            >
              {/* Colour bar */}
              <div className={`w-1 self-stretch flex-shrink-0 ${bar}`} />
              <Icon size={15} className={`${iconCls} flex-shrink-0 mt-3`} />
              <p className="flex-1 text-sm text-slate-700 leading-snug py-3 pr-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 p-3 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Schließen"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
