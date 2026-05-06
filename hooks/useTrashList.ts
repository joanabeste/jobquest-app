'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface TrashItemStorage<T> {
  getTrash: () => Promise<T[]>;
  restore: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
}

interface UseTrashListOptions<T> {
  storage: TrashItemStorage<T>;
  /** Called after restore/permanent succeeds — use to invalidate the active list cache. */
  onChange?: () => void;
  /** When false, the hook stays idle (no fetches). Used to lazy-load the trash tab. */
  enabled?: boolean;
}

interface UseTrashListResult<T> {
  items: T[];
  loading: boolean;
  reload: () => Promise<void>;
  restore: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
}

export function useTrashList<T extends { id: string; title: string }>(
  opts: UseTrashListOptions<T>,
): UseTrashListResult<T> {
  const { storage, onChange, enabled = true } = opts;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const toast = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await storage.getTrash();
      setItems(all);
    } catch (err) {
      console.error('[useTrashList] reload failed', err);
      toast.error('Papierkorb konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [storage, toast]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const restore = useCallback(async (id: string) => {
    try {
      await storage.restore(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      onChange?.();
      toast.success('Wiederhergestellt.');
    } catch (err) {
      console.error('[useTrashList] restore failed', err);
      toast.error(err instanceof Error ? err.message : 'Wiederherstellen fehlgeschlagen.');
    }
  }, [storage, onChange, toast]);

  const permanentDelete = useCallback(async (id: string) => {
    try {
      await storage.permanentDelete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      onChange?.();
      toast.success('Endgültig gelöscht.');
    } catch (err) {
      console.error('[useTrashList] permanent delete failed', err);
      toast.error('Löschen fehlgeschlagen.');
    }
  }, [storage, onChange, toast]);

  return { items, loading, reload, restore, permanentDelete };
}
