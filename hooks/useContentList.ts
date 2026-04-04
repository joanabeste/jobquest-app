'use client';

import { useState, useCallback, useRef } from 'react';
import { generateSlug } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface ContentListStorage<T> {
  getAll: () => Promise<T[]>;
  duplicate: (id: string, newId: string, newSlug: string) => Promise<T | null>;
  delete: (id: string) => Promise<void>;
}

interface UseContentListOptions<T extends { id: string; title: string }> {
  storage: ContentListStorage<T>;
  /** Called once per item after loading to get its count (e.g. leads, submissions). */
  getCount?: (id: string) => Promise<number>;
}

interface UseContentListResult<T> {
  items: T[];
  counts: Record<string, number>;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  reload: () => Promise<void>;
  handleDuplicate: (item: T) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function useContentList<T extends { id: string; title: string }>(
  opts: UseContentListOptions<T>,
): UseContentListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const toast = useToast();

  // Keep opts stable across renders without forcing re-creates of reload
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reload = useCallback(async () => {
    try {
      const { storage, getCount } = optsRef.current;
      const all = await storage.getAll();
      setItems(all);
      if (getCount) {
        const c: Record<string, number> = {};
        for (const item of all) {
          c[item.id] = await getCount(item.id);
        }
        setCounts(c);
      }
    } catch (err) {
      console.error('[useContentList] reload failed:', err);
      toast.error('Inhalte konnten nicht geladen werden. Bitte Seite neu laden.');
    }
  }, [toast]);

  const handleDuplicate = useCallback(async (item: T) => {
    try {
      await optsRef.current.storage.duplicate(item.id, crypto.randomUUID(), generateSlug(item.title));
      await reload();
      toast.success('Erfolgreich dupliziert.');
    } catch (err) {
      console.error('[useContentList] duplicate failed:', err);
      toast.error('Duplizieren fehlgeschlagen. Bitte erneut versuchen.');
    }
  }, [reload, toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await optsRef.current.storage.delete(id);
      setDeleteConfirm(null);
      await reload();
    } catch (err) {
      console.error('[useContentList] delete failed:', err);
      setDeleteConfirm(null);
      toast.error('Löschen fehlgeschlagen. Bitte erneut versuchen.');
    }
  }, [reload, toast]);

  return { items, counts, deleteConfirm, setDeleteConfirm, reload, handleDuplicate, handleDelete };
}
