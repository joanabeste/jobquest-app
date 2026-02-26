import { FunnelDoc } from './funnel-types';

const KEY = 'jq_funnel_docs';

function getAll(): Record<string, FunnelDoc> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export const funnelStorage = {
  getByContentId(contentId: string): FunnelDoc | null {
    return Object.values(getAll()).find((d) => d.contentId === contentId) ?? null;
  },
  save(doc: FunnelDoc): void {
    const all = getAll();
    all[doc.id] = { ...doc, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(all));
  },
  delete(id: string): void {
    const all = getAll();
    delete all[id];
    localStorage.setItem(KEY, JSON.stringify(all));
  },
  deleteForContentIds(contentIds: string[]): void {
    const all = getAll();
    const filtered = Object.fromEntries(
      Object.entries(all).filter(([, doc]) => !contentIds.includes(doc.contentId))
    );
    localStorage.setItem(KEY, JSON.stringify(filtered));
  },
};
