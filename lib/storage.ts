import { Company, JobQuest, Lead, AnalyticsEvent, CareerCheck, CareerCheckLead, FormPage, FormSubmission, WorkspaceMember } from './types';
import { createClient } from './supabase/client';
import { questFromDb, leadToDb, analyticsToDb, careerCheckFromDb, careerCheckLeadToDb, formPageFromDb, formSubmissionToDb, companyFromDb } from './supabase/mappers';

// ─── Helpers ────────────────────────────────────────────────────────────────

function supabase() {
  return createClient();
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ─── Company Storage ────────────────────────────────────────────────────────

export const companyStorage = {
  getAll: async (): Promise<Company[]> => {
    return [];
  },

  getById: async (id: string): Promise<Company | undefined> => {
    const { data } = await supabase()
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    return data ? companyFromDb(data) : undefined;
  },

  getByEmail: async (email: string): Promise<Company | undefined> => {
    const { data } = await supabase()
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

  getByCompany: async (_companyId: string): Promise<JobQuest[]> => {
    return apiFetch<JobQuest[]>('/api/quests');
  },

  getById: async (id: string): Promise<JobQuest | undefined> => {
    try {
      return await apiFetch<JobQuest>(`/api/quests/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<JobQuest | undefined> => {
    const { data } = await supabase()
      .from('job_quests')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? questFromDb(data) : undefined;
  },

  save: async (quest: JobQuest): Promise<void> => {
    const res = await fetch(`/api/quests/${quest.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quest),
    });
    if (res.status === 404 || res.status === 500) {
      await apiFetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quest),
      });
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
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

  getByCompany: async (_companyId: string): Promise<Lead[]> => {
    return apiFetch<Lead[]>('/api/leads');
  },

  save: async (lead: Lead): Promise<void> => {
    const { error } = await supabase()
      .from('leads')
      .insert(leadToDb(lead));
    if (error) console.error('Lead save error:', error.message);
  },

  deleteByCompany: async (_companyId: string): Promise<void> => {
    // Handled by cascade on company delete
  },
};

// ─── Analytics Storage ──────────────────────────────────────────────────────

export const analyticsStorage = {
  getAll: async (): Promise<AnalyticsEvent[]> => {
    return [];
  },

  getByQuest: async (questId: string): Promise<AnalyticsEvent[]> => {
    return apiFetch<AnalyticsEvent[]>(`/api/analytics?questId=${questId}`);
  },

  save: async (event: AnalyticsEvent): Promise<void> => {
    const { error } = await supabase()
      .from('analytics_events')
      .insert(analyticsToDb(event));
    if (error) console.error('Analytics save error:', error.message);
  },
};

// ─── Career Check Storage ───────────────────────────────────────────────────

export const careerCheckStorage = {
  getAll: async (): Promise<CareerCheck[]> => {
    return apiFetch<CareerCheck[]>('/api/career-checks');
  },

  getByCompany: async (_companyId: string): Promise<CareerCheck[]> => {
    return apiFetch<CareerCheck[]>('/api/career-checks');
  },

  getById: async (id: string): Promise<CareerCheck | undefined> => {
    try {
      return await apiFetch<CareerCheck>(`/api/career-checks/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<CareerCheck | undefined> => {
    const { data } = await supabase()
      .from('career_checks')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? careerCheckFromDb(data) : undefined;
  },

  save: async (check: CareerCheck): Promise<void> => {
    const res = await fetch(`/api/career-checks/${check.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(check),
    });
    if (res.status === 404 || res.status === 500) {
      await apiFetch('/api/career-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check),
      });
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
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

  getByCompany: async (_companyId: string): Promise<CareerCheckLead[]> => {
    return apiFetch<CareerCheckLead[]>('/api/career-check-leads');
  },

  save: async (lead: CareerCheckLead): Promise<void> => {
    const { error } = await supabase()
      .from('career_check_leads')
      .insert(careerCheckLeadToDb(lead));
    if (error) console.error('CareerCheckLead save error:', error.message);
  },

  deleteByCompany: async (_companyId: string): Promise<void> => {
    // Handled by cascade
  },
};

// ─── Form Page Storage ──────────────────────────────────────────────────────

export const formPageStorage = {
  getAll: async (): Promise<FormPage[]> => {
    return apiFetch<FormPage[]>('/api/form-pages');
  },

  getByCompany: async (_companyId: string): Promise<FormPage[]> => {
    return apiFetch<FormPage[]>('/api/form-pages');
  },

  getById: async (id: string): Promise<FormPage | undefined> => {
    try {
      return await apiFetch<FormPage>(`/api/form-pages/${id}`);
    } catch {
      return undefined;
    }
  },

  getBySlug: async (slug: string): Promise<FormPage | undefined> => {
    const { data } = await supabase()
      .from('form_pages')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data ? formPageFromDb(data) : undefined;
  },

  save: async (form: FormPage): Promise<void> => {
    const res = await fetch(`/api/form-pages/${form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.status === 404 || res.status === 500) {
      await apiFetch('/api/form-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
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

  getByCompany: async (_companyId: string): Promise<FormSubmission[]> => {
    return apiFetch<FormSubmission[]>('/api/form-submissions');
  },

  save: async (submission: FormSubmission): Promise<void> => {
    const { error } = await supabase()
      .from('form_submissions')
      .insert(formSubmissionToDb(submission));
    if (error) console.error('FormSubmission save error:', error.message);
  },

  deleteByCompany: async (_companyId: string): Promise<void> => {
    // Handled by cascade
  },
};

// ─── Member Storage ─────────────────────────────────────────────────────────

export const memberStorage = {
  getAll: async (): Promise<WorkspaceMember[]> => {
    return apiFetch<WorkspaceMember[]>('/api/members');
  },

  getByCompany: async (_companyId: string): Promise<WorkspaceMember[]> => {
    return apiFetch<WorkspaceMember[]>('/api/members');
  },

  getById: async (id: string): Promise<WorkspaceMember | undefined> => {
    try {
      return await apiFetch<WorkspaceMember>(`/api/members/${id}`);
    } catch {
      return undefined;
    }
  },

  getByEmail: async (_email: string): Promise<WorkspaceMember | undefined> => {
    return undefined;
  },

  save: async (member: WorkspaceMember): Promise<void> => {
    try {
      await apiFetch(`/api/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
    } catch {
      await apiFetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
    }
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
  },
};

// ─── Auth Session ───────────────────────────────────────────────────────────

export const authSession = {
  getCurrentMemberId: async (): Promise<string | null> => {
    try {
      const data = await apiFetch<{ member: { id: string } | null }>('/api/auth/me');
      return data.member?.id ?? null;
    } catch {
      return null;
    }
  },

  setCurrentMemberId: (_id: string): void => {
    // No-op: session is managed via httpOnly cookie
  },

  getCurrentCompanyId: (): string | null => {
    return null;
  },

  clear: async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' });
  },
};
