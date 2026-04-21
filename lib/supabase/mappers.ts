import type {
  Company,
  JobQuest,
  Lead,
  AnalyticsEvent,
  CareerCheck,
  CareerCheckLead,
  FormPage,
  FormSubmission,
  WorkspaceMember,
  WorkspaceRole,
  CorporateDesign,
  FunnelComment,
  ReviewLink,
} from '../types';
import type { FunnelDoc, EmailConfig } from '../funnel-types';
import { type DbRow, str, optStr, num, json, optBool, bool } from './row-helpers';

// All `*FromDb` mappers take `DbRow` (a typed alias for `Record<string,
// unknown>`) and read fields through helpers in `row-helpers.ts`. There is
// no longer any `any` in this file — schema drift now fails loudly at the
// boundary instead of silently producing `undefined`.

// ─── Company ────────────────────────────────────────────────────────────────

export function companyFromDb(row: DbRow): Company {
  const showcaseCfg = json<Record<string, unknown> | undefined>(row, 'showcase_config');
  return {
    id: str(row, 'id'),
    name: str(row, 'name'),
    slug: optStr(row, 'slug'),
    description: optStr(row, 'description'),
    industry: str(row, 'industry'),
    location: str(row, 'location'),
    logo: optStr(row, 'logo'),
    privacyUrl: optStr(row, 'privacy_url'),
    imprintUrl: optStr(row, 'imprint_url'),
    careerPageUrl: optStr(row, 'career_page_url'),
    contactName: str(row, 'contact_name'),
    contactEmail: str(row, 'contact_email'),
    createdAt: str(row, 'created_at'),
    corporateDesign: json<CorporateDesign | undefined>(row, 'corporate_design'),
    successPage: json(row, 'success_page'),
    showcase: showcaseCfg && Object.keys(showcaseCfg).length > 0
      ? (showcaseCfg as unknown as Company['showcase'])
      : undefined,
    plan: {
      maxJobQuests: num(row, 'max_job_quests', 1),
      maxBerufschecks: num(row, 'max_berufschecks', 0),
      maxFormulare: num(row, 'max_formulare', 0),
    },
    features: json(row, 'features') ?? {},
    customDomain: optStr(row, 'custom_domain'),
    domainVerified: optBool(row, 'domain_verified'),
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
    ...(c.plan ? {
      max_job_quests: c.plan.maxJobQuests,
      max_berufschecks: c.plan.maxBerufschecks,
      max_formulare: c.plan.maxFormulare,
    } : {}),
    ...(c.slug !== undefined ? { slug: c.slug || null } : {}),
    ...(c.showcase !== undefined ? { showcase_config: c.showcase } : {}),
    ...(c.features !== undefined ? { features: c.features } : {}),
    ...(c.customDomain !== undefined ? { custom_domain: c.customDomain || null } : {}),
    ...(c.domainVerified !== undefined ? { domain_verified: c.domainVerified } : {}),
  };
}

// ─── WorkspaceMember ────────────────────────────────────────────────────────

export function memberFromDb(row: DbRow): WorkspaceMember {
  return {
    id: str(row, 'id'),
    companyId: str(row, 'company_id'),
    name: str(row, 'name'),
    email: str(row, 'email'),
    role: str(row, 'role') as WorkspaceRole,
    invitedBy: optStr(row, 'invited_by'),
    status: str(row, 'status') as WorkspaceMember['status'],
    createdAt: str(row, 'created_at'),
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

// ─── FunnelComment ──────────────────────────────────────────────────────────

export function commentFromDb(row: DbRow): FunnelComment {
  return {
    id: str(row, 'id'),
    funnelDocId: str(row, 'funnel_doc_id'),
    pageId: str(row, 'page_id'),
    blockId: optStr(row, 'block_id'),
    parentId: optStr(row, 'parent_id'),
    authorType: str(row, 'author_type') as FunnelComment['authorType'],
    authorMemberId: optStr(row, 'author_member_id'),
    authorName: str(row, 'author_name'),
    authorEmail: optStr(row, 'author_email'),
    content: str(row, 'content'),
    status: str(row, 'status') as FunnelComment['status'],
    resolvedBy: optStr(row, 'resolved_by'),
    resolvedAt: optStr(row, 'resolved_at'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
  };
}

export function reviewLinkFromDb(row: DbRow): ReviewLink {
  return {
    id: str(row, 'id'),
    funnelDocId: str(row, 'funnel_doc_id'),
    companyId: str(row, 'company_id'),
    token: str(row, 'token'),
    label: optStr(row, 'label'),
    canComment: bool(row, 'can_comment'),
    expiresAt: optStr(row, 'expires_at'),
    createdBy: optStr(row, 'created_by'),
    createdAt: str(row, 'created_at'),
    revokedAt: optStr(row, 'revoked_at'),
  };
}

export function commentToDb(c: FunnelComment, companyId: string): Record<string, unknown> {
  return {
    id: c.id,
    funnel_doc_id: c.funnelDocId,
    company_id: companyId,
    page_id: c.pageId,
    block_id: c.blockId ?? null,
    parent_id: c.parentId ?? null,
    author_type: c.authorType,
    author_member_id: c.authorMemberId ?? null,
    author_name: c.authorName,
    author_email: c.authorEmail ?? null,
    content: c.content,
    status: c.status,
    resolved_by: c.resolvedBy ?? null,
    resolved_at: c.resolvedAt ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

// ─── JobQuest ───────────────────────────────────────────────────────────────

export function questFromDb(row: DbRow): JobQuest {
  return {
    id: str(row, 'id'),
    companyId: str(row, 'company_id'),
    title: str(row, 'title'),
    slug: str(row, 'slug'),
    status: str(row, 'status') as JobQuest['status'],
    modules: json<JobQuest['modules']>(row, 'modules', [] as JobQuest['modules']),
    leadConfig: json<JobQuest['leadConfig']>(row, 'lead_config'),
    cardImage: optStr(row, 'card_image'),
    useCustomDomain: optBool(row, 'use_custom_domain'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
    publishedAt: optStr(row, 'published_at'),
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
    card_image: q.cardImage || null,
    use_custom_domain: q.useCustomDomain ?? false,
  };
}

// ─── Lead ───────────────────────────────────────────────────────────────────

export function leadFromDb(row: DbRow): Lead {
  return {
    id: str(row, 'id'),
    jobQuestId: str(row, 'job_quest_id'),
    companyId: str(row, 'company_id'),
    firstName: str(row, 'first_name'),
    lastName: str(row, 'last_name'),
    email: str(row, 'email'),
    phone: optStr(row, 'phone'),
    gdprConsent: bool(row, 'gdpr_consent'),
    submittedAt: str(row, 'submitted_at'),
    customFields: json<Lead['customFields']>(row, 'custom_fields'),
    emailSent: optBool(row, 'email_sent'),
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

export function analyticsFromDb(row: DbRow): AnalyticsEvent {
  return {
    id: str(row, 'id'),
    jobQuestId: row.job_quest_id == null ? undefined : str(row, 'job_quest_id'),
    careerCheckId: row.career_check_id == null ? undefined : str(row, 'career_check_id'),
    formPageId: row.form_page_id == null ? undefined : str(row, 'form_page_id'),
    type: str(row, 'type') as AnalyticsEvent['type'],
    sessionId: str(row, 'session_id'),
    moduleId: row.module_id == null ? undefined : str(row, 'module_id'),
    duration: row.duration == null ? undefined : num(row, 'duration'),
    timestamp: str(row, 'timestamp'),
  };
}

export function analyticsToDb(e: AnalyticsEvent): Record<string, unknown> {
  return {
    id: e.id,
    job_quest_id: e.jobQuestId ?? null,
    career_check_id: e.careerCheckId ?? null,
    form_page_id: e.formPageId ?? null,
    type: e.type,
    session_id: e.sessionId,
    module_id: e.moduleId ?? null,
    duration: e.duration ?? null,
    timestamp: e.timestamp,
  };
}

// ─── CareerCheck ────────────────────────────────────────────────────────────

export function careerCheckFromDb(row: DbRow): CareerCheck {
  return {
    id: str(row, 'id'),
    companyId: str(row, 'company_id'),
    title: str(row, 'title'),
    slug: str(row, 'slug'),
    status: str(row, 'status') as CareerCheck['status'],
    blocks: json<CareerCheck['blocks']>(row, 'blocks', [] as CareerCheck['blocks']),
    dimensions: json<CareerCheck['dimensions']>(row, 'dimensions', [] as CareerCheck['dimensions']),
    cardImage: optStr(row, 'card_image'),
    useCustomDomain: optBool(row, 'use_custom_domain'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
    publishedAt: optStr(row, 'published_at'),
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
    card_image: c.cardImage || null,
    use_custom_domain: c.useCustomDomain ?? false,
  };
}

// ─── CareerCheckLead ────────────────────────────────────────────────────────

export function careerCheckLeadFromDb(row: DbRow): CareerCheckLead {
  return {
    id: str(row, 'id'),
    careerCheckId: str(row, 'career_check_id'),
    companyId: str(row, 'company_id'),
    firstName: str(row, 'first_name'),
    lastName: str(row, 'last_name'),
    email: str(row, 'email'),
    phone: optStr(row, 'phone'),
    gdprConsent: bool(row, 'gdpr_consent'),
    scores: json<CareerCheckLead['scores']>(row, 'scores', {} as CareerCheckLead['scores']),
    customFields: json<Record<string, string>>(row, 'custom_fields', {}),
    emailSent: optBool(row, 'email_sent'),
    submittedAt: str(row, 'submitted_at'),
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
    custom_fields: l.customFields ?? {},
    submitted_at: l.submittedAt,
  };
}

// ─── FormPage ───────────────────────────────────────────────────────────────

export function formPageFromDb(row: DbRow): FormPage {
  return {
    id: str(row, 'id'),
    companyId: str(row, 'company_id'),
    title: str(row, 'title'),
    slug: str(row, 'slug'),
    status: str(row, 'status') as FormPage['status'],
    contentBlocks: json<FormPage['contentBlocks']>(row, 'content_blocks', [] as FormPage['contentBlocks']),
    formSteps: json<FormPage['formSteps']>(row, 'form_steps', [] as FormPage['formSteps']),
    formConfig: json<FormPage['formConfig']>(row, 'form_config', {} as FormPage['formConfig']),
    useCustomDomain: optBool(row, 'use_custom_domain'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
    publishedAt: optStr(row, 'published_at'),
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
    use_custom_domain: f.useCustomDomain ?? false,
  };
}

// ─── FormSubmission ─────────────────────────────────────────────────────────

export function formSubmissionFromDb(row: DbRow): FormSubmission {
  return {
    id: str(row, 'id'),
    formPageId: str(row, 'form_page_id'),
    companyId: str(row, 'company_id'),
    answers: json<FormSubmission['answers']>(row, 'answers', {} as FormSubmission['answers']),
    gdprConsent: bool(row, 'gdpr_consent'),
    submittedAt: str(row, 'submitted_at'),
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

export function funnelDocFromDb(row: DbRow): FunnelDoc {
  return {
    id: str(row, 'id'),
    contentId: str(row, 'content_id'),
    contentType: str(row, 'content_type') as FunnelDoc['contentType'],
    pages: json<FunnelDoc['pages']>(row, 'pages', [] as FunnelDoc['pages']),
    emailConfig: json<EmailConfig | undefined>(row, 'email_config'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
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
