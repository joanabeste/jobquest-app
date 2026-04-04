'use client';

import { useCallback, useState } from 'react';
import type { FunnelDoc } from '@/lib/funnel-types';

export interface FunnelHistory {
  doc: FunnelDoc;
  push: (next: FunnelDoc) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useFunnelHistory(initial: FunnelDoc): FunnelHistory {
  const [past, setPast] = useState<FunnelDoc[]>([]);
  const [present, setPresent] = useState<FunnelDoc>(initial);
  const [future, setFuture] = useState<FunnelDoc[]>([]);

  const push = useCallback((next: FunnelDoc) => {
    setPast((p) => [...p.slice(-50), present]);
    setPresent(next);
    setFuture([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [present, ...f]);
    setPresent(prev);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, present]);
    setPresent(next);
  }, [future, present]);

  return { doc: present, push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
