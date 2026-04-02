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

export const questStorage = {
  getAll: async (): Promise<JobQuest[]> => {
    return apiFetch<JobQuest[]>('/api/quests');
  },

  getByCompany: (_companyId: string) => questStorage.getAll(),

  getById: async (id: string): Promise<JobQuest | undefined> => {
    try {
      return await apiFetch<JobQuest>(`/api/quests/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<JobQuest | undefined> => {
    const { data } = await createClient()
      .from('job_quests')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? questFromDb(data) : undefined;
  },

  save: async (quest: JobQuest): Promise<void> => {
    await apiUpsert(`/api/quests/${quest.id}`, '/api/quests', quest);
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch(`/api/quests/${id}`, { method: 'DELETE' });
  },

  duplicate: async (id: string, newId: string, newSlug: string): Promise<JobQuest | null> => {
    try {
      return await apiFetch<JobQuest>(`/api/quests/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newId, newSlug }),
      });
    } catch {
      return null;
    }
  },
};

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

export const careerCheckStorage = {
  getAll: async (): Promise<CareerCheck[]> => {
    return apiFetch<CareerCheck[]>('/api/career-checks');
  },

  getByCompany: (_companyId: string) => careerCheckStorage.getAll(),

  getById: async (id: string): Promise<CareerCheck | undefined> => {
    try {
      return await apiFetch<CareerCheck>(`/api/career-checks/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<CareerCheck | undefined> => {
    const { data } = await createClient()
      .from('career_checks')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? careerCheckFromDb(data) : undefined;
  },

  save: async (check: CareerCheck): Promise<void> => {
    await apiUpsert(`/api/career-checks/${check.id}`, '/api/career-checks', check);
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch(`/api/career-checks/${id}`, { method: 'DELETE' });
  },

  duplicate: async (id: string, newId: string, newSlug: string): Promise<CareerCheck | null> => {
    try {
      return await apiFetch<CareerCheck>(`/api/career-checks/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newId, newSlug }),
      });
    } catch {
      return null;
    }
  },
};

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

export const formPageStorage = {
  getAll: async (): Promise<FormPage[]> => {
    return apiFetch<FormPage[]>('/api/form-pages');
  },

  getByCompany: (_companyId: string) => formPageStorage.getAll(),

  getById: async (id: string): Promise<FormPage | undefined> => {
    try {
      return await apiFetch<FormPage>(`/api/form-pages/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<FormPage | undefined> => {
    const { data } = await createClient()
      .from('form_pages')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? formPageFromDb(data) : undefined;
  },

  save: async (form: FormPage): Promise<void> => {
    await apiUpsert(`/api/form-pages/${form.id}`, '/api/form-pages', form);
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch(`/api/form-pages/${id}`, { method: 'DELETE' });
  },

  duplicate: async (id: string, newId: string, newSlug: string): Promise<FormPage | null> => {
    try {
      return await apiFetch<FormPage>(`/api/form-pages/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newId, newSlug }),
      });
    } catch {
      return null;
    }
  },
};

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

