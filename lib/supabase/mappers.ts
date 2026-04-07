import type { Company, JobQuest, Lead, AnalyticsEvent, CareerCheck, CareerCheckLead, FormPage, FormSubmission, WorkspaceMember } from '../types';
import type { FunnelDoc } from '../funnel-types';

// fromDb functions intentionally use `any` — the Supabase clients are untyped
// to avoid RLS 'never' issues, so row shapes cannot be statically verified here.
 

// ─── Company ────────────────────────────────────────────────────────────────

export function companyFromDb(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    industry: row.industry,
    location: row.location,
    logo: row.logo ?? undefined,
    privacyUrl: row.privacy_url ?? undefined,
    imprintUrl: row.imprint_url ?? undefined,
    careerPageUrl: row.career_page_url ?? undefined,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
    corporateDesign: row.corporate_design ?? undefined,
    successPage: row.success_page ?? undefined,
    plan: {
      maxJobQuests: row.max_job_quests ?? 1,
      maxBerufschecks: row.max_berufschecks ?? 0,
      maxFormulare: row.max_formulare ?? 0,
    },
  };
}

export function companyToDb(c: Company): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    industry: c.industry,
    location: c.location,
    logo: c.logo ?? null,
    privacy_url: c.privacyUrl ?? null,
    imprint_url: c.imprintUrl ?? null,
    career_page_url: c.careerPageUrl ?? null,
    contact_name: c.contactName,
    contact_email: c.contactEmail,
    corporate_design: c.corporateDesign ?? {},
    success_page: c.successPage ?? null,
    created_at: c.createdAt,
    // Plan columns — only include if plan is explicitly set (avoids errors if DB migration hasn't run yet)
    ...(c.plan ? {
      max_job_quests: c.plan.maxJobQuests,
      max_berufschecks: c.plan.maxBerufschecks,
      max_formulare: c.plan.maxFormulare,
    } : {}),
  };
}

// ─── WorkspaceMember ────────────────────────────────────────────────────────

export function memberFromDb(row: any): WorkspaceMember {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function memberToDb(m: WorkspaceMember): Record<string, unknown> {
  return {
    id: m.id,
    company_id: m.companyId,
    name: m.name,
    email: m.email,
    role: m.role,
    invited_by: m.invitedBy ?? null,
    status: m.status,
    created_at: m.createdAt,
  };
}

// ─── JobQuest ───────────────────────────────────────────────────────────────

export function questFromDb(row: any): JobQuest {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    modules: row.modules ?? [],
    leadConfig: row.lead_config ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export function questToDb(q: JobQuest): Record<string, unknown> {
  return {
    id: q.id,
    company_id: q.companyId,
    title: q.title,
    slug: q.slug,
    status: q.status,
    modules: q.modules,
    lead_config: q.leadConfig ?? null,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
    published_at: q.publishedAt ?? null,
  };
}

// ─── Lead ───────────────────────────────────────────────────────────────────

export function leadFromDb(row: any): Lead {
  return {
    id: row.id,
    jobQuestId: row.job_quest_id,
    companyId: row.company_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? undefined,
    gdprConsent: row.gdpr_consent,
    submittedAt: row.submitted_at,
    customFields: row.custom_fields ?? undefined,
    emailSent: row.email_sent ?? undefined,
  };
}

export function leadToDb(l: Lead): Record<string, unknown> {
  return {
    id: l.id,
    job_quest_id: l.jobQuestId,
    company_id: l.companyId,
    first_name: l.firstName ?? '',
    last_name: l.lastName ?? '',
    email: l.email ?? '',
    phone: l.phone ?? null,
    gdpr_consent: l.gdprConsent,
    custom_fields: l.customFields ?? {},
    submitted_at: l.submittedAt,
  };
}

// ─── AnalyticsEvent ─────────────────────────────────────────────────────────

export function analyticsFromDb(row: any): AnalyticsEvent {
  return {
    id: row.id,
    jobQuestId: row.job_quest_id,
    type: row.type,
    sessionId: row.session_id,
    duration: row.duration ?? undefined,
    timestamp: row.timestamp,
  };
}

export function analyticsToDb(e: AnalyticsEvent): Record<string, unknown> {
  return {
    id: e.id,
    job_quest_id: e.jobQuestId,
    type: e.type,
    session_id: e.sessionId,
    duration: e.duration ?? null,
    timestamp: e.timestamp,
  };
}

// ─── CareerCheck ────────────────────────────────────────────────────────────

export function careerCheckFromDb(row: any): CareerCheck {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    blocks: row.blocks ?? [],
    dimensions: row.dimensions ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export function careerCheckToDb(c: CareerCheck): Record<string, unknown> {
  return {
    id: c.id,
    company_id: c.companyId,
    title: c.title,
    slug: c.slug,
    status: c.status,
    blocks: c.blocks,
    dimensions: c.dimensions,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    published_at: c.publishedAt ?? null,
  };
}

// ─── CareerCheckLead ────────────────────────────────────────────────────────

export function careerCheckLeadFromDb(row: any): CareerCheckLead {
  return {
    id: row.id,
    careerCheckId: row.career_check_id,
    companyId: row.company_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? undefined,
    gdprConsent: row.gdpr_consent,
    scores: row.scores ?? {},
    submittedAt: row.submitted_at,
  };
}

export function careerCheckLeadToDb(l: CareerCheckLead): Record<string, unknown> {
  return {
    id: l.id,
    career_check_id: l.careerCheckId,
    company_id: l.companyId,
    first_name: l.firstName,
    last_name: l.lastName,
    email: l.email,
    phone: l.phone ?? null,
    gdpr_consent: l.gdprConsent,
    scores: l.scores,
    submitted_at: l.submittedAt,
  };
}

// ─── FormPage ───────────────────────────────────────────────────────────────

export function formPageFromDb(row: any): FormPage {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    contentBlocks: row.content_blocks ?? [],
    formSteps: row.form_steps ?? [],
    formConfig: row.form_config ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export function formPageToDb(f: FormPage): Record<string, unknown> {
  return {
    id: f.id,
    company_id: f.companyId,
    title: f.title,
    slug: f.slug,
    status: f.status,
    content_blocks: f.contentBlocks,
    form_steps: f.formSteps,
    form_config: f.formConfig,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
    published_at: f.publishedAt ?? null,
  };
}

// ─── FormSubmission ─────────────────────────────────────────────────────────

export function formSubmissionFromDb(row: any): FormSubmission {
  return {
    id: row.id,
    formPageId: row.form_page_id,
    companyId: row.company_id,
    answers: row.answers ?? {},
    gdprConsent: row.gdpr_consent,
    submittedAt: row.submitted_at,
  };
}

export function formSubmissionToDb(s: FormSubmission): Record<string, unknown> {
  return {
    id: s.id,
    form_page_id: s.formPageId,
    company_id: s.companyId,
    answers: s.answers,
    gdpr_consent: s.gdprConsent,
    submitted_at: s.submittedAt,
  };
}

// ─── FunnelDoc ──────────────────────────────────────────────────────────────

export function funnelDocFromDb(row: any): FunnelDoc {
  return {
    id: row.id,
    contentId: row.content_id,
    contentType: row.content_type,
    pages: row.pages ?? [],
    emailConfig: row.email_config ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function funnelDocToDb(d: FunnelDoc): Record<string, unknown> {
  return {
    id: d.id,
    content_id: d.contentId,
    content_type: d.contentType,
    pages: d.pages,
    email_config: d.emailConfig ?? null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}
