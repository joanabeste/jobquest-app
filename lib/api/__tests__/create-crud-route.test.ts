/**
 * Tests for the createCrudRoute factory — covers GET, PUT, DELETE
 * with both success and error paths, without touching a real database.
 */

import { createCrudRoute } from '../create-crud-route';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';

jest.mock('@/lib/api-auth', () => ({
  getSession: jest.fn(),
  unauthorized: jest.fn(() =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const mockGetSession = getSession as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;

// ─── Supabase chain helper ────────────────────────────────────────────────────

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'update', 'delete', 'single']) {
    chain[m] = () => chain;
  }
  (chain as unknown as PromiseLike<unknown>).then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// ─── Test fixture ─────────────────────────────────────────────────────────────

interface TestItem { id: string; companyId: string; name: string }

const opts = {
  table: 'test_items',
  fromDb: (row: Record<string, unknown>): TestItem => ({
    id: String(row.id),
    companyId: String(row.company_id),
    name: String(row.name),
  }),
  toDb: (item: TestItem): Record<string, unknown> => ({
    id: item.id,
    company_id: item.companyId,
    name: item.name,
  }),
};

const { GET, PUT, DELETE } = createCrudRoute(opts);

const fakeSession = {
  company: { id: 'c1' },
  member: { id: 'm1' },
};

function routeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('createCrudRoute — GET', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET({} as NextRequest, routeCtx('item-1'));
    expect(res.status).toBe(401);
  });

  test('returns 200 with item when found', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const dbRow = { id: 'item-1', company_id: 'c1', name: 'Test Item' };
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: dbRow, error: null }) });

    const res = await GET({} as NextRequest, routeCtx('item-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'item-1', companyId: 'c1', name: 'Test Item' });
  });

  test('returns 404 when item not found', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: null }) });

    const res = await GET({} as NextRequest, routeCtx('missing'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });
});

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe('createCrudRoute — PUT', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PUT(makeReq({}), routeCtx('item-1'));
    expect(res.status).toBe(401);
  });

  test('returns 200 with updated item on success', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const dbRow = { id: 'item-1', company_id: 'c1', name: 'Updated' };
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: dbRow, error: null }) });

    const res = await PUT(
      makeReq({ id: 'item-1', companyId: 'c1', name: 'Updated' }),
      routeCtx('item-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated');
  });

  test('returns 500 when database returns an error', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: { message: 'Constraint violation' } }) });

    const res = await PUT(makeReq({ id: 'item-1', companyId: 'c1', name: 'X' }), routeCtx('item-1'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Constraint violation');
  });

  test('returns 404 when update returns no data', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: null }) });

    const res = await PUT(makeReq({ id: 'item-1', companyId: 'c1', name: 'X' }), routeCtx('item-1'));
    expect(res.status).toBe(404);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('createCrudRoute — DELETE', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE({} as NextRequest, routeCtx('item-1'));
    expect(res.status).toBe(401);
  });

  test('returns 200 with ok:true on success', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: null }) });

    const res = await DELETE({} as NextRequest, routeCtx('item-1'));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test('returns 500 when database returns an error', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: null, error: { message: 'Delete failed' } }) });

    const res = await DELETE({} as NextRequest, routeCtx('item-1'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Delete failed');
  });
});
