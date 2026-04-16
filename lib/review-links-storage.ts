import type { ReviewLink } from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export interface CreateReviewLinkInput {
  funnelDocId: string;
  label?: string;
  canComment?: boolean;
  expiresInDays?: number | null;
}

export const reviewLinksStorage = {
  list: async (funnelDocId: string): Promise<ReviewLink[]> => {
    const res = await fetch(`/api/review-links?funnelDocId=${encodeURIComponent(funnelDocId)}`);
    return handle<ReviewLink[]>(res);
  },

  create: async (input: CreateReviewLinkInput): Promise<ReviewLink> => {
    const res = await fetch('/api/review-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handle<ReviewLink>(res);
  },

  revoke: async (id: string): Promise<ReviewLink> => {
    const res = await fetch(`/api/review-links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revoke: true }),
    });
    return handle<ReviewLink>(res);
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`/api/review-links/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
  },
};
