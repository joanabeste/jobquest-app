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
  /** Stable key used to share the cache across mounts/navigations. */
  cacheKey: string;
  storage: ContentListStorage<T>;
  /** Single grouped count fetch — preferred over getCount. */
  getCounts?: () => Promise<Record<string, number>>;
  /** Per-item count fallback. Triggers N requests; avoid for dashboards. */
  getCount?: (id: string) => Promise<number>;
}

interface UseContentListResult<T> {
  items: T[];
  counts: Record<string, number>;
  loading: boolean;
  deleteConfirm: { id: string; title: string } | null;
  setDeleteConfirm: (value: { id: string; title: string } | null) => void;
  reload: () => Promise<void>;
  handleDuplicate: (item: T) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

interface CacheEntry<T> {
  items: T[];
  counts: Record<string, number>;
}

// Module-global cache, shared across all useContentList mounts.
const cache = new Map<string, CacheEntry<unknown>>();

export function useContentList<T extends { id: string; title: string }>(
  opts: UseContentListOptions<T>,
): UseContentListResult<T> {
  const cached = cache.get(opts.cacheKey) as CacheEntry<T> | undefined;
  const [items, setItems] = useState<T[]>(cached?.items ?? []);
  const [counts, setCounts] = useState<Record<string, number>>(cached?.counts ?? {});
  const [loading, setLoading] = useState(!cached);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const toast = useToast();

  // Keep opts stable across renders without forcing re-creates of reload
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reload = useCallback(async () => {
    const { cacheKey, storage, getCounts, getCount } = optsRef.current;
    const hasCached = cache.has(cacheKey);
    // Show spinner only when nothing is cached. Otherwise revalidate silently.
    if (!hasCached) setLoading(true);
    try {
      const all = await storage.getAll();
      setItems(all);
      if (!hasCached) setLoading(false);

      let nextCounts: Record<string, number> = {};
      if (getCounts) {
        nextCounts = await getCounts();
        setCounts(nextCounts);
      } else if (getCount) {
        const entries = await Promise.all(
          all.map(async (item) => [item.id, await getCount(item.id)] as const),
        );
        nextCounts = Object.fromEntries(entries);
        setCounts(nextCounts);
      }

      cache.set(cacheKey, { items: all, counts: nextCounts });
    } catch (err) {
      console.error('[useContentList] reload failed:', err);
      toast.error('Inhalte konnten nicht geladen werden. Bitte Seite neu laden.');
      if (!hasCached) setLoading(false);
    }
  }, [toast]);

  const handleDuplicate = useCallback(async (item: T) => {
    try {
      await optsRef.current.storage.duplicate(item.id, crypto.randomUUID(), generateSlug(item.title));
      cache.delete(optsRef.current.cacheKey);
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
      cache.delete(optsRef.current.cacheKey);
      await reload();
    } catch (err) {
      console.error('[useContentList] delete failed:', err);
      setDeleteConfirm(null);
      toast.error('Löschen fehlgeschlagen. Bitte erneut versuchen.');
    }
  }, [reload, toast]);

  return { items, counts, loading, deleteConfirm, setDeleteConfirm, reload, handleDuplicate, handleDelete };
}

/** Invalidate a specific cache entry — call from outside the hook (e.g., after a save). */
export function invalidateContentList(cacheKey: string) {
  cache.delete(cacheKey);
}
