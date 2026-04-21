 
import {
  companyFromDb, companyToDb,
  memberFromDb, memberToDb,
  questFromDb, questToDb,
  leadFromDb, leadToDb,
  analyticsFromDb, analyticsToDb,
  careerCheckFromDb, careerCheckToDb,
  careerCheckLeadFromDb, careerCheckLeadToDb,
  formPageFromDb, formPageToDb,
  formSubmissionFromDb, formSubmissionToDb,
  funnelDocFromDb, funnelDocToDb,
} from '../mappers';

// ─── Company ──────────────────────────────────────────────────────────────────

describe('companyFromDb / companyToDb', () => {
  const company = {
    id: 'c1',
    name: 'Acme GmbH',
    description: 'Wir sind ein Software-Unternehmen.',
    industry: 'IT & Technologie',
    location: 'Berlin',
    logo: 'https://example.com/logo.png',
    privacyUrl: 'https://example.com/privacy',
    imprintUrl: 'https://example.com/imprint',
    contactName: 'Max Mustermann',
    contactEmail: 'max@acme.de',
    createdAt: '2025-01-01T00:00:00Z',
    corporateDesign: { primaryColor: '#7c3aed', accentColor: '#f59e0b', textColor: '#1e293b', headingColor: '#0f172a', borderRadius: 12, headingFontName: 'system', bodyFontName: 'system' },
    plan: { maxJobQuests: 5, maxBerufschecks: 2, maxFormulare: 0 },
    features: {},
  };

  const dbRow = {
    id: 'c1',
    name: 'Acme GmbH',
    description: 'Wir sind ein Software-Unternehmen.',
    industry: 'IT & Technologie',
    location: 'Berlin',
    logo: 'https://example.com/logo.png',
    privacy_url: 'https://example.com/privacy',
    imprint_url: 'https://example.com/imprint',
    career_page_url: null,
    contact_name: 'Max Mustermann',
    contact_email: 'max@acme.de',
    created_at: '2025-01-01T00:00:00Z',
    corporate_design: { primaryColor: '#7c3aed', accentColor: '#f59e0b', textColor: '#1e293b', headingColor: '#0f172a', borderRadius: 12, headingFontName: 'system', bodyFontName: 'system' },
    success_page: null,
    features: {},
    max_job_quests: 5,
    max_berufschecks: 2,
    max_formulare: 0,
  };

  test('fromDb maps snake_case to camelCase', () => {
    expect(companyFromDb(dbRow)).toEqual(company);
  });

  test('toDb maps camelCase to snake_case', () => {
    expect(companyToDb(company as any)).toEqual(dbRow);
  });

  test('optional fields default to undefined when null', () => {
    const row = { ...dbRow, logo: null, privacy_url: null, imprint_url: null, corporate_design: null };
    const result = companyFromDb(row);
    expect(result.logo).toBeUndefined();
    expect(result.privacyUrl).toBeUndefined();
    expect(result.imprintUrl).toBeUndefined();
    expect(result.corporateDesign).toBeUndefined();
  });

  test('toDb writes null for missing optional fields', () => {
    const { logo: _logo, privacyUrl: _pu, imprintUrl: _iu, corporateDesign: _cd, ...minimal } = company;
    const result = companyToDb(minimal as any);
    expect(result.logo).toBeNull();
    expect(result.privacy_url).toBeNull();
    expect(result.imprint_url).toBeNull();
    expect(result.corporate_design).toEqual({});
  });
});

// ─── WorkspaceMember ──────────────────────────────────────────────────────────

describe('memberFromDb / memberToDb', () => {
  const member = {
    id: 'm1',
    companyId: 'c1',
    name: 'Anna',
    email: 'anna@acme.de',
    role: 'admin' as const,
    invitedBy: 'm0',
    status: 'active' as const,
    createdAt: '2025-06-01T00:00:00Z',
  };

  const dbRow = {
    id: 'm1',
    company_id: 'c1',
    name: 'Anna',
    email: 'anna@acme.de',
    role: 'admin',
    invited_by: 'm0',
    status: 'active',
    created_at: '2025-06-01T00:00:00Z',
  };

  test('roundtrip fromDb(toDb(member))', () => {
    expect(memberFromDb(memberToDb(member))).toEqual(member);
  });

  test('invitedBy is undefined when null in db', () => {
    expect(memberFromDb({ ...dbRow, invited_by: null }).invitedBy).toBeUndefined();
  });

  test('toDb writes null for missing invitedBy', () => {
    const { invitedBy: _ib, ...noInvite } = member;
    expect(memberToDb(noInvite as any).invited_by).toBeNull();
  });
});

// ─── JobQuest ─────────────────────────────────────────────────────────────────

describe('questFromDb / questToDb', () => {
  const quest = {
    id: 'q1',
    companyId: 'c1',
    title: 'Test Quest',
    slug: 'test-quest',
    status: 'draft' as const,
    modules: [{ id: 'mod1', type: 'info', title: 'Hallo', text: 'Welt' }],
    leadConfig: { headline: 'Hi', subtext: '', buttonText: 'Go', showPhone: true, privacyText: '', thankYouHeadline: '', thankYouText: '' },
    cardImage: undefined,
    useCustomDomain: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    publishedAt: '2025-01-03T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(questFromDb(questToDb(quest as any))).toEqual(quest);
  });

  test('nullable fields', () => {
    const row = {
      id: 'q2', company_id: 'c1', title: 'T', slug: 's', status: 'draft',
      modules: null, lead_config: null, created_at: '', updated_at: '', published_at: null,
    };
    const result = questFromDb(row);
    expect(result.modules).toEqual([]);
    expect(result.leadConfig).toBeUndefined();
    expect(result.publishedAt).toBeUndefined();
  });
});

// ─── Lead ─────────────────────────────────────────────────────────────────────

describe('leadFromDb / leadToDb', () => {
  const lead = {
    id: 'l1',
    jobQuestId: 'q1',
    companyId: 'c1',
    firstName: 'Max',
    lastName: 'Muster',
    email: 'max@test.de',
    phone: '0170-123',
    gdprConsent: true,
    submittedAt: '2025-06-01T00:00:00Z',
    customFields: { hobby: 'Tennis' },
  };

  test('roundtrip', () => {
    expect(leadFromDb(leadToDb(lead as any))).toEqual(lead);
  });

  test('optional phone and customFields', () => {
    const row = {
      id: 'l2', job_quest_id: 'q1', company_id: 'c1',
      first_name: 'A', last_name: 'B', email: 'a@b.de',
      phone: null, gdpr_consent: false, submitted_at: '', custom_fields: null,
    };
    const result = leadFromDb(row);
    expect(result.phone).toBeUndefined();
    expect(result.customFields).toBeUndefined();
  });
});

// ─── AnalyticsEvent ───────────────────────────────────────────────────────────

describe('analyticsFromDb / analyticsToDb', () => {
  const event = {
    id: 'a1',
    jobQuestId: 'q1',
    type: 'view' as const,
    sessionId: 'sess1',
    duration: 42,
    timestamp: '2025-06-01T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(analyticsFromDb(analyticsToDb(event as any))).toEqual(event);
  });

  test('duration nullable', () => {
    const row = { id: 'a2', job_quest_id: 'q1', type: 'start', session_id: 's', duration: null, timestamp: '' };
    expect(analyticsFromDb(row).duration).toBeUndefined();
  });
});

// ─── CareerCheck ──────────────────────────────────────────────────────────────

describe('careerCheckFromDb / careerCheckToDb', () => {
  const check = {
    id: 'cc1',
    companyId: 'c1',
    title: 'Berufscheck',
    slug: 'berufscheck',
    status: 'published' as const,
    blocks: [{ id: 'b1', type: 'intro', headline: 'Hi', subtext: '', buttonText: 'Start' }],
    dimensions: [{ id: 'd1', name: 'Technik' }],
    cardImage: undefined,
    useCustomDomain: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    publishedAt: '2025-01-03T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(careerCheckFromDb(careerCheckToDb(check as any))).toEqual(check);
  });

  test('blocks/dimensions default to empty arrays', () => {
    const row = {
      id: 'cc2', company_id: 'c1', title: 'T', slug: 's', status: 'draft',
      blocks: null, dimensions: null, created_at: '', updated_at: '', published_at: null,
    };
    const result = careerCheckFromDb(row);
    expect(result.blocks).toEqual([]);
    expect(result.dimensions).toEqual([]);
  });
});

// ─── CareerCheckLead ──────────────────────────────────────────────────────────

describe('careerCheckLeadFromDb / careerCheckLeadToDb', () => {
  const lead = {
    id: 'ccl1',
    careerCheckId: 'cc1',
    companyId: 'c1',
    firstName: 'Max',
    lastName: 'Muster',
    email: 'max@test.de',
    phone: '0170',
    gdprConsent: true,
    scores: { d1: 8, d2: 5 },
    customFields: { interessierteBerufe: 'Werkzeugmechaniker (m/w/d)' },
    // emailSent wird nur via UPDATE nach erfolgreichem Mail-Versand gesetzt,
    // nicht beim Insert — daher im Roundtrip undefined.
    emailSent: undefined,
    submittedAt: '2025-06-01T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(careerCheckLeadFromDb(careerCheckLeadToDb(lead as any))).toEqual(lead);
  });

  test('scores default to empty object', () => {
    const row = {
      id: 'ccl2', career_check_id: 'cc1', company_id: 'c1',
      first_name: 'A', last_name: 'B', email: 'a@b.de',
      phone: null, gdpr_consent: true, scores: null, submitted_at: '',
    };
    expect(careerCheckLeadFromDb(row).scores).toEqual({});
  });
});

// ─── FormPage ─────────────────────────────────────────────────────────────────

describe('formPageFromDb / formPageToDb', () => {
  const page = {
    id: 'fp1',
    companyId: 'c1',
    title: 'Bewerbung',
    slug: 'bewerbung',
    status: 'draft' as const,
    contentBlocks: [{ id: 'cb1', type: 'hero', headline: 'Hi', subtext: '', ctaText: 'Go' }],
    formSteps: [{ id: 'fs1', title: 'Step 1', fields: [] }],
    formConfig: { headline: '', submitButtonText: '', thankYouHeadline: '', thankYouText: '', privacyText: '' },
    useCustomDomain: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    publishedAt: '2025-01-03T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(formPageFromDb(formPageToDb(page as any))).toEqual(page);
  });

  test('nullable arrays default to empty', () => {
    const row = {
      id: 'fp2', company_id: 'c1', title: 'T', slug: 's', status: 'draft',
      content_blocks: null, form_steps: null, form_config: null,
      created_at: '', updated_at: '', published_at: null,
    };
    const result = formPageFromDb(row);
    expect(result.contentBlocks).toEqual([]);
    expect(result.formSteps).toEqual([]);
    expect(result.formConfig).toEqual({});
  });
});

// ─── FormSubmission ───────────────────────────────────────────────────────────

describe('formSubmissionFromDb / formSubmissionToDb', () => {
  const submission = {
    id: 'sub1',
    formPageId: 'fp1',
    companyId: 'c1',
    answers: { name: 'Max', email: 'max@test.de' },
    gdprConsent: true,
    submittedAt: '2025-06-01T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(formSubmissionFromDb(formSubmissionToDb(submission as any))).toEqual(submission);
  });

  test('answers default to empty object', () => {
    const row = {
      id: 'sub2', form_page_id: 'fp1', company_id: 'c1',
      answers: null, gdpr_consent: false, submitted_at: '',
    };
    expect(formSubmissionFromDb(row).answers).toEqual({});
  });
});

// ─── FunnelDoc ────────────────────────────────────────────────────────────────

describe('funnelDocFromDb / funnelDocToDb', () => {
  const doc = {
    id: 'fd1',
    contentId: 'q1',
    contentType: 'quest' as const,
    pages: [{ id: 'p1', name: 'Page 1', nodes: [] }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  };

  test('roundtrip', () => {
    expect(funnelDocFromDb(funnelDocToDb(doc as any))).toEqual(doc);
  });

  test('pages default to empty array', () => {
    const row = {
      id: 'fd2', content_id: 'q1', content_type: 'quest',
      pages: null, created_at: '', updated_at: '',
    };
    expect(funnelDocFromDb(row).pages).toEqual([]);
  });
});
