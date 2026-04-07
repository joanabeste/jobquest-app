'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Tailwind z-index utility — lets callers stack above other modals (default z-50). */
  zIndexClass?: string;
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Endgültig löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
  zIndexClass = 'z-50',
}: ConfirmModalProps) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm`}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">{title}</h2>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
