import type { FunnelComment } from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export interface CreateCommentInput {
  funnelDocId: string;
  pageId: string;
  blockId?: string;
  parentId?: string;
  content: string;
}

export interface UpdateCommentInput {
  content?: string;
  status?: 'open' | 'resolved';
}

export const funnelCommentsStorage = {
  list: async (funnelDocId: string): Promise<FunnelComment[]> => {
    const res = await fetch(`/api/funnel-comments?funnelDocId=${encodeURIComponent(funnelDocId)}`);
    return handle<FunnelComment[]>(res);
  },

  create: async (input: CreateCommentInput): Promise<FunnelComment> => {
    const res = await fetch('/api/funnel-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handle<FunnelComment>(res);
  },

  update: async (id: string, patch: UpdateCommentInput): Promise<FunnelComment> => {
    const res = await fetch(`/api/funnel-comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return handle<FunnelComment>(res);
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`/api/funnel-comments/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
  },
};
