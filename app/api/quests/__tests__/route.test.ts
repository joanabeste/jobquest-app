/**
 * Tests for /api/quests — GET (list) and POST (create).
 *
 * Strategy: jest.mock the two external dependencies (api-auth + supabase/admin)
 * so we never touch a real database. The Supabase builder chain is faked with a
 * small "chainable" helper that resolves to whatever result we supply.
 */

import { GET, POST } from '../route';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/api-auth', () => ({
  getSession: jest.fn(),
  unauthorized: jest.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

// Quota check is exercised by /api/quests POST via the createContentRoute
// helper. Tests don't care about quota arithmetic; always allow.
jest.mock('@/lib/quota', () => ({
  checkQuota: jest.fn().mockResolvedValue({ allowed: true, current: 0, max: 100 }),
}));

const mockGetSession = getSession as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;

/** Builds a Supabase builder chain that resolves to `result` when awaited. */
function makeChain(result: { data: unknown; error: unknown }) {
   
  const chain: any = {};
  for (const m of ['from', 'select', 'eq', 'order', 'insert', 'update', 'single', 'upsert']) {
    chain[m] = () => chain;
  }
  // Make it thenable so `await chain` returns result
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

const fakeSession = {
  company: { id: 'company-1', name: 'Acme' },
  member: { id: 'member-1', role: 'admin' },
};

const dbRow = {
  id: 'q1',
  company_id: 'company-1',
  title: 'Test Quest',
  slug: 'test-quest',
  status: 'draft',
  modules: null,
  lead_config: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  published_at: null,
};

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/quests', () => {
  test('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('returns 200 with quest list for authenticated user', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: [dbRow], error: null }) });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('q1');
    expect(body[0].title).toBe('Test Quest');
    expect(body[0].companyId).toBe('company-1');
  });

  test('returns empty array when no quests exist', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: null }) });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('returns 500 when database returns an error', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: { message: 'DB error' } }) });

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('list_failed');
  });
});

// ─── POST ────────────────────────────────────────────────────────────────────

function makePostReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe('POST /api/quests', () => {
  test('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makePostReq({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('creates quest and returns 200 with the new record', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: dbRow, error: null }) });

    const req = makePostReq({ id: 'q1', title: 'Test Quest', slug: 'test-quest', status: 'draft', modules: [], companyId: 'company-1', createdAt: '', updatedAt: '' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('q1');
    expect(body.title).toBe('Test Quest');
  });

  test('returns 500 when database returns an error on insert', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: { message: 'Insert failed' } }) });

    const req = makePostReq({ id: 'q1', title: 'T', slug: 's', status: 'draft', modules: [], companyId: 'company-1', createdAt: '', updatedAt: '' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('create_failed');
  });

  test('returns 500 when insert succeeds but data is null', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: null }) });

    const req = makePostReq({ id: 'q1', title: 'T', slug: 's', status: 'draft', modules: [], companyId: 'c1', createdAt: '', updatedAt: '' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('create_failed');
  });
});
