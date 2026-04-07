/**
 * Tests for createContentRoute — the shared list+create handler used by
 * /api/quests, /api/career-checks and /api/form-pages.
 */

import { createContentRoute } from '../create-content-route';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkQuota } from '@/lib/quota';
import type { NextRequest } from 'next/server';

jest.mock('@/lib/api-auth', () => ({
  getSession: jest.fn(),
  unauthorized: jest.fn(() =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  ),
}));

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));

jest.mock('@/lib/quota', () => ({
  checkQuota: jest.fn(),
}));

const mockGetSession = getSession as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;
const mockCheckQuota = checkQuota as jest.Mock;

interface TestItem { id: string; companyId: string; title: string }

const fromDb = (row: Record<string, unknown>): TestItem => ({
  id: String(row.id),
  companyId: String(row.company_id),
  title: String(row.title),
});

const toDb = (i: TestItem): Record<string, unknown> => ({
  id: i.id, company_id: i.companyId, title: i.title,
});

const { GET, POST } = createContentRoute<TestItem>({
  table: 'job_quests',
  quotaKind: 'jobquests',
  quotaLabel: 'Quests',
  fromDb,
  toDb,
});

const fakeSession = {
  company: { id: 'company-1', plan: { maxJobQuests: 10, maxBerufschecks: 0, maxFormulare: 0 } },
  member: { id: 'm1' },
};

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> & PromiseLike<unknown> = {} as never;
  for (const m of ['from', 'select', 'eq', 'order', 'insert', 'single']) {
    (chain as Record<string, unknown>)[m] = () => chain;
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

function makeReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckQuota.mockResolvedValue({ allowed: true, current: 0, max: 10 });
});

describe('createContentRoute — GET', () => {
  test('401 without session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test('200 with mapped list', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({
      from: () => makeChain({ data: [{ id: 'i1', company_id: 'company-1', title: 'A' }], error: null }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0]).toEqual({ id: 'i1', companyId: 'company-1', title: 'A' });
  });

  test('500 list_failed (no leak) on db error', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'pg internal' } }),
    });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('list_failed');
    expect(JSON.stringify(body)).not.toContain('pg internal');
    errSpy.mockRestore();
  });
});

describe('createContentRoute — POST', () => {
  test('401 without session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(401);
  });

  test('403 when quota exhausted', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCheckQuota.mockResolvedValue({ allowed: false, current: 10, max: 10 });
    const res = await POST(makeReq({ id: 'x', companyId: 'c', title: 't' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Kontingent erreicht/);
  });

  test('400 invalid_json on malformed body', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const req = { json: async () => { throw new Error('bad'); } } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });

  test('overrides client-supplied companyId with session company', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    let inserted: Record<string, unknown> | null = null;
    mockCreateAdminClient.mockReturnValue({
      from: () => {
        const chain = makeChain({ data: { id: 'i1', company_id: 'company-1', title: 't' }, error: null });
        // Capture insert payload
        (chain as unknown as { insert: (v: Record<string, unknown>) => unknown }).insert = (v) => {
          inserted = v;
          return chain;
        };
        return chain;
      },
    });
    const res = await POST(makeReq({ id: 'i1', companyId: 'EVIL', title: 't' }));
    expect(res.status).toBe(200);
    expect(inserted).not.toBeNull();
    expect((inserted as unknown as Record<string, unknown>).company_id).toBe('company-1');
  });

  test('500 create_failed (no leak) on insert error', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'pg unique violation' } }),
    });
    const res = await POST(makeReq({ id: 'i1', companyId: 'c', title: 't' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('create_failed');
    expect(JSON.stringify(body)).not.toContain('pg unique');
    errSpy.mockRestore();
  });
});
