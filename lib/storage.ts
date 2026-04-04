import { Company, JobQuest, Lead, AnalyticsEvent, CareerCheck, CareerCheckLead, FormPage, FormSubmission, WorkspaceMember } from './types';
import { createClient } from './supabase/client';
import { questFromDb, leadToDb, analyticsToDb, careerCheckFromDb, careerCheckLeadToDb, formPageFromDb, formSubmissionToDb, companyFromDb } from './supabase/mappers';
import { apiFetch } from './api-fetch';

// PUT an existing record; fall back to POST if it doesn't exist yet (404/500).
async function apiUpsert<T>(putUrl: string, postUrl: string, body: T): Promise<void> {
  const json = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(putUrl, json);
  if (res.status === 404 || res.status === 500) {
    await apiFetch(postUrl, { ...json, method: 'POST' });
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
}

/** Generic CRUD storage factory for content types (quest, career-check, form-page). */
function createContentStorage<T extends { id: string; title?: string }, S extends { slug: string }>(
  endpoint: string,
  supabaseTable: string,
  fromDb: (row: Record<string, unknown>) => T,
  supabaseSlugField = 'slug',
) {
  return {
    getAll: (): Promise<T[]> => apiFetch<T[]>(`/api/${endpoint}`),

    // companyId is filtered server-side via session — parameter kept for API compatibility.
    getByCompany: (_companyId: string): Promise<T[]> => apiFetch<T[]>(`/api/${endpoint}`),

    getById: async (id: string): Promise<T | undefined> => {
      try {
        return await apiFetch<T>(`/api/${endpoint}/${id}`);
      } catch {
        return undefined;
      }
    },

    getBySlug: async (slug: string): Promise<T | undefined> => {
      const { data } = await createClient()
        .from(supabaseTable)
        .select('*')
        .eq(supabaseSlugField, slug)
        .eq('status', 'published')
        .single();
      return data ? fromDb(data as Record<string, unknown>) : undefined;
    },

    save: async (item: T & { id: string }): Promise<void> => {
      await apiUpsert(`/api/${endpoint}/${item.id}`, `/api/${endpoint}`, item);
    },

    delete: async (id: string): Promise<void> => {
      await apiFetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
    },

    duplicate: async (id: string, newId: string, newSlug: string): Promise<T | null> => {
      try {
        return await apiFetch<T>(`/api/${endpoint}/${id}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newId, newSlug }),
        });
      } catch {
        return null;
      }
    },
  };
}

// ─── Company Storage ────────────────────────────────────────────────────────

export const companyStorage = {
  getById: async (id: string): Promise<Company | undefined> => {
    const { data } = await createClient()
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    return data ? companyFromDb(data) : undefined;
  },

  getByEmail: async (email: string): Promise<Company | undefined> => {
    const { data } = await createClient()
      .from('companies')
      .select('*')
      .eq('contact_email', email)
      .single();
    return data ? companyFromDb(data) : undefined;
  },

  save: async (company: Company): Promise<void> => {
    await apiFetch('/api/companies/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    });
  },

  delete: async (_id: string): Promise<void> => {
    await apiFetch('/api/companies/me/delete', { method: 'POST' });
  },
};

// ─── Quest Storage ──────────────────────────────────────────────────────────

export const questStorage = createContentStorage<JobQuest, { slug: string }>(
  'quests',
  'job_quests',
  (row) => questFromDb(row as Parameters<typeof questFromDb>[0]),
);

// ─── Lead Storage ───────────────────────────────────────────────────────────

export const leadStorage = {
  getAll: async (): Promise<Lead[]> => {
    return apiFetch<Lead[]>('/api/leads');
  },

  getByQuest: async (questId: string): Promise<Lead[]> => {
    return apiFetch<Lead[]>(`/api/leads?questId=${questId}`);
  },

  getByCompany: (_companyId: string) => leadStorage.getAll(),

  save: async (lead: Lead): Promise<void> => {
    const { error } = await createClient()
      .from('leads')
      .insert(leadToDb(lead));
    if (error) throw new Error(error.message);
  },
};

// ─── Analytics Storage ──────────────────────────────────────────────────────

export const analyticsStorage = {
  getByQuest: async (questId: string): Promise<AnalyticsEvent[]> => {
    return apiFetch<AnalyticsEvent[]>(`/api/analytics?questId=${questId}`);
  },

  save: async (event: AnalyticsEvent): Promise<void> => {
    const { error } = await createClient()
      .from('analytics_events')
      .insert(analyticsToDb(event));
    if (error) throw new Error(error.message);
  },
};

// ─── Career Check Storage ───────────────────────────────────────────────────

export const careerCheckStorage = createContentStorage<CareerCheck, { slug: string }>(
  'career-checks',
  'career_checks',
  (row) => careerCheckFromDb(row as Parameters<typeof careerCheckFromDb>[0]),
);

// ─── Career Check Lead Storage ──────────────────────────────────────────────

export const careerCheckLeadStorage = {
  getAll: async (): Promise<CareerCheckLead[]> => {
    return apiFetch<CareerCheckLead[]>('/api/career-check-leads');
  },

  getByCheck: async (careerCheckId: string): Promise<CareerCheckLead[]> => {
    return apiFetch<CareerCheckLead[]>(`/api/career-check-leads?checkId=${careerCheckId}`);
  },

  getByCompany: (_companyId: string) => careerCheckLeadStorage.getAll(),

  save: async (lead: CareerCheckLead): Promise<void> => {
    const { error } = await createClient()
      .from('career_check_leads')
      .insert(careerCheckLeadToDb(lead));
    if (error) throw new Error(error.message);
  },
};

// ─── Form Page Storage ──────────────────────────────────────────────────────

export const formPageStorage = createContentStorage<FormPage, { slug: string }>(
  'form-pages',
  'form_pages',
  (row) => formPageFromDb(row as Parameters<typeof formPageFromDb>[0]),
);

// ─── Form Submission Storage ────────────────────────────────────────────────

export const formSubmissionStorage = {
  getAll: async (): Promise<FormSubmission[]> => {
    return apiFetch<FormSubmission[]>('/api/form-submissions');
  },

  getByForm: async (formPageId: string): Promise<FormSubmission[]> => {
    return apiFetch<FormSubmission[]>(`/api/form-submissions?formId=${formPageId}`);
  },

  getByCompany: (_companyId: string) => formSubmissionStorage.getAll(),

  save: async (submission: FormSubmission): Promise<void> => {
    const { error } = await createClient()
      .from('form_submissions')
      .insert(formSubmissionToDb(submission));
    if (error) throw new Error(error.message);
  },
};

// ─── Member Storage ─────────────────────────────────────────────────────────

export const memberStorage = {
  getAll: async (): Promise<WorkspaceMember[]> => {
    return apiFetch<WorkspaceMember[]>('/api/members');
  },

  getByCompany: (_companyId: string) => memberStorage.getAll(),

  getById: async (id: string): Promise<WorkspaceMember | undefined> => {
    try {
      return await apiFetch<WorkspaceMember>(`/api/members/${id}`);
    } catch {
      return undefined;
    }
  },

  save: async (member: WorkspaceMember): Promise<void> => {
    await apiUpsert(`/api/members/${member.id}`, '/api/members', member);
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
  },
};

