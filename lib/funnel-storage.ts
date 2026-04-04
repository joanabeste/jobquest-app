import { FunnelDoc } from './funnel-types';
import { createClient } from './supabase/client';
import { funnelDocFromDb } from './supabase/mappers';

function supabase() {
  return createClient();
}

export const funnelStorage = {
  getByContentId: async (contentId: string): Promise<FunnelDoc | null> => {
    const { data } = await supabase()
      .from('funnel_docs')
      .select('*')
      .eq('content_id', contentId)
      .single();
    return data ? funnelDocFromDb(data) : null;
  },

  getByContentIdAuth: async (contentId: string): Promise<FunnelDoc | null> => {
    const res = await fetch(`/api/funnel-docs?contentId=${contentId}`);
    if (!res.ok) return null;
    return res.json();
  },

  save: async (doc: FunnelDoc): Promise<void> => {
    const res = await fetch('/api/funnel-docs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`/api/funnel-docs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
  },

  deleteForContentIds: async (_contentIds: string[]): Promise<void> => {
    // Handled by company delete API or cascade
  },
};
