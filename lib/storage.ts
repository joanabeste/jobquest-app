import { Company, JobQuest, Lead, AnalyticsEvent, CareerCheck, CareerCheckLead, FormPage, FormSubmission, WorkspaceMember } from './types';

const KEYS = {
  COMPANIES: 'jq_companies',
  QUESTS: 'jq_quests',
  LEADS: 'jq_leads',
  ANALYTICS: 'jq_analytics',
  CURRENT_COMPANY: 'jq_current_company',
  CURRENT_MEMBER: 'jq_current_member',
  MEMBERS: 'jq_members',
  CAREER_CHECKS: 'jq_career_checks',
  CAREER_CHECK_LEADS: 'jq_career_check_leads',
  FORM_PAGES: 'jq_form_pages',
  FORM_SUBMISSIONS: 'jq_form_submissions',
};

function getItem<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const companyStorage = {
  getAll: (): Company[] => getItem<Company>(KEYS.COMPANIES),

  getById: (id: string): Company | undefined =>
    companyStorage.getAll().find((c) => c.id === id),

  getByEmail: (email: string): Company | undefined =>
    companyStorage.getAll().find((c) => c.contactEmail === email),

  save: (company: Company): void => {
    const companies = companyStorage.getAll();
    const idx = companies.findIndex((c) => c.id === company.id);
    if (idx >= 0) companies[idx] = company;
    else companies.push(company);
    setItem(KEYS.COMPANIES, companies);
  },

  delete: (id: string): void => {
    setItem(
      KEYS.COMPANIES,
      companyStorage.getAll().filter((c) => c.id !== id)
    );
  },
};

export const questStorage = {
  getAll: (): JobQuest[] => getItem<JobQuest>(KEYS.QUESTS),

  getByCompany: (companyId: string): JobQuest[] =>
    questStorage.getAll().filter((q) => q.companyId === companyId),

  getById: (id: string): JobQuest | undefined =>
    questStorage.getAll().find((q) => q.id === id),

  getBySlug: (slug: string): JobQuest | undefined =>
    questStorage.getAll().find((q) => q.slug === slug && q.status === 'published'),

  save: (quest: JobQuest): void => {
    const quests = questStorage.getAll();
    const idx = quests.findIndex((q) => q.id === quest.id);
    if (idx >= 0) quests[idx] = quest;
    else quests.push(quest);
    setItem(KEYS.QUESTS, quests);
  },

  delete: (id: string): void => {
    setItem(
      KEYS.QUESTS,
      questStorage.getAll().filter((q) => q.id !== id)
    );
  },

  duplicate: (id: string, newId: string, newSlug: string): JobQuest | null => {
    const original = questStorage.getById(id);
    if (!original) return null;
    const duplicate: JobQuest = {
      ...original,
      id: newId,
      slug: newSlug,
      title: `${original.title} (Kopie)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
      modules: original.modules.map((m) => ({ ...m, id: crypto.randomUUID() })),
    };
    questStorage.save(duplicate);
    return duplicate;
  },
};

export const leadStorage = {
  getAll: (): Lead[] => getItem<Lead>(KEYS.LEADS),

  getByQuest: (questId: string): Lead[] =>
    leadStorage.getAll().filter((l) => l.jobQuestId === questId),

  getByCompany: (companyId: string): Lead[] =>
    leadStorage.getAll().filter((l) => l.companyId === companyId),

  save: (lead: Lead): void => {
    const leads = leadStorage.getAll();
    leads.push(lead);
    setItem(KEYS.LEADS, leads);
  },

  deleteByCompany: (companyId: string): void => {
    setItem(KEYS.LEADS, leadStorage.getAll().filter((l) => l.companyId !== companyId));
  },
};

export const analyticsStorage = {
  getAll: (): AnalyticsEvent[] => getItem<AnalyticsEvent>(KEYS.ANALYTICS),

  getByQuest: (questId: string): AnalyticsEvent[] =>
    analyticsStorage.getAll().filter((e) => e.jobQuestId === questId),

  save: (event: AnalyticsEvent): void => {
    const events = analyticsStorage.getAll();
    events.push(event);
    setItem(KEYS.ANALYTICS, events);
  },
};

export const careerCheckStorage = {
  getAll: (): CareerCheck[] => getItem<CareerCheck>(KEYS.CAREER_CHECKS),

  getByCompany: (companyId: string): CareerCheck[] =>
    careerCheckStorage.getAll().filter((c) => c.companyId === companyId),

  getById: (id: string): CareerCheck | undefined =>
    careerCheckStorage.getAll().find((c) => c.id === id),

  getBySlug: (slug: string): CareerCheck | undefined =>
    careerCheckStorage.getAll().find((c) => c.slug === slug && c.status === 'published'),

  save: (check: CareerCheck): void => {
    const all = careerCheckStorage.getAll();
    const idx = all.findIndex((c) => c.id === check.id);
    if (idx >= 0) all[idx] = check;
    else all.push(check);
    setItem(KEYS.CAREER_CHECKS, all);
  },

  delete: (id: string): void => {
    setItem(KEYS.CAREER_CHECKS, careerCheckStorage.getAll().filter((c) => c.id !== id));
  },

  duplicate: (id: string, newId: string, newSlug: string): CareerCheck | null => {
    const original = careerCheckStorage.getById(id);
    if (!original) return null;
    const dup: CareerCheck = {
      ...original,
      id: newId,
      slug: newSlug,
      title: `${original.title} (Kopie)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
      blocks: original.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };
    careerCheckStorage.save(dup);
    return dup;
  },
};

export const careerCheckLeadStorage = {
  getAll: (): CareerCheckLead[] => getItem<CareerCheckLead>(KEYS.CAREER_CHECK_LEADS),

  getByCheck: (careerCheckId: string): CareerCheckLead[] =>
    careerCheckLeadStorage.getAll().filter((l) => l.careerCheckId === careerCheckId),

  getByCompany: (companyId: string): CareerCheckLead[] =>
    careerCheckLeadStorage.getAll().filter((l) => l.companyId === companyId),

  save: (lead: CareerCheckLead): void => {
    const all = careerCheckLeadStorage.getAll();
    all.push(lead);
    setItem(KEYS.CAREER_CHECK_LEADS, all);
  },

  deleteByCompany: (companyId: string): void => {
    setItem(KEYS.CAREER_CHECK_LEADS, careerCheckLeadStorage.getAll().filter((l) => l.companyId !== companyId));
  },
};

export const formPageStorage = {
  getAll: (): FormPage[] => getItem<FormPage>(KEYS.FORM_PAGES),

  getByCompany: (companyId: string): FormPage[] =>
    formPageStorage.getAll().filter((f) => f.companyId === companyId),

  getById: (id: string): FormPage | undefined =>
    formPageStorage.getAll().find((f) => f.id === id),

  getBySlug: (slug: string): FormPage | undefined =>
    formPageStorage.getAll().find((f) => f.slug === slug && f.status === 'published'),

  save: (form: FormPage): void => {
    const all = formPageStorage.getAll();
    const idx = all.findIndex((f) => f.id === form.id);
    if (idx >= 0) all[idx] = form;
    else all.push(form);
    setItem(KEYS.FORM_PAGES, all);
  },

  delete: (id: string): void => {
    setItem(KEYS.FORM_PAGES, formPageStorage.getAll().filter((f) => f.id !== id));
  },

  duplicate: (id: string, newId: string, newSlug: string): FormPage | null => {
    const original = formPageStorage.getById(id);
    if (!original) return null;
    const dup: FormPage = {
      ...original,
      id: newId,
      slug: newSlug,
      title: `${original.title} (Kopie)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
    };
    formPageStorage.save(dup);
    return dup;
  },
};

export const formSubmissionStorage = {
  getAll: (): FormSubmission[] => getItem<FormSubmission>(KEYS.FORM_SUBMISSIONS),

  getByForm: (formPageId: string): FormSubmission[] =>
    formSubmissionStorage.getAll().filter((s) => s.formPageId === formPageId),

  getByCompany: (companyId: string): FormSubmission[] =>
    formSubmissionStorage.getAll().filter((s) => s.companyId === companyId),

  save: (submission: FormSubmission): void => {
    const all = formSubmissionStorage.getAll();
    all.push(submission);
    setItem(KEYS.FORM_SUBMISSIONS, all);
  },

  deleteByCompany: (companyId: string): void => {
    setItem(KEYS.FORM_SUBMISSIONS, formSubmissionStorage.getAll().filter((s) => s.companyId !== companyId));
  },
};

export const memberStorage = {
  getAll: (): WorkspaceMember[] => getItem<WorkspaceMember>(KEYS.MEMBERS),

  getByCompany: (companyId: string): WorkspaceMember[] =>
    memberStorage.getAll().filter((m) => m.companyId === companyId),

  getById: (id: string): WorkspaceMember | undefined =>
    memberStorage.getAll().find((m) => m.id === id),

  getByEmail: (email: string): WorkspaceMember | undefined =>
    memberStorage.getAll().find((m) => m.email === email && m.status === 'active'),

  save: (member: WorkspaceMember): void => {
    const all = memberStorage.getAll();
    const idx = all.findIndex((m) => m.id === member.id);
    if (idx >= 0) all[idx] = member;
    else all.push(member);
    setItem(KEYS.MEMBERS, all);
  },

  delete: (id: string): void => {
    setItem(KEYS.MEMBERS, memberStorage.getAll().filter((m) => m.id !== id));
  },
};

export const authSession = {
  getCurrentMemberId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEYS.CURRENT_MEMBER);
  },

  setCurrentMemberId: (id: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.CURRENT_MEMBER, id);
  },

  // Legacy: still needed for migration detection
  getCurrentCompanyId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEYS.CURRENT_COMPANY);
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.CURRENT_MEMBER);
    localStorage.removeItem(KEYS.CURRENT_COMPANY);
  },
};
