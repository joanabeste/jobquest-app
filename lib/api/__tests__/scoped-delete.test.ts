/**
 * Tests for the scoped-delete helper used by leads / form-submissions /
 * career-check-leads. Verifies UUID validation, auth, company scoping, and
 * generic error envelopes.
 */

import { createScopedDelete } from '../scoped-delete';
import { getSession } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';

jest.mock('@/lib/api-auth', () => ({
  getSession: jest.fn(),
  unauthorized: jest.fn(() =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  ),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const mockGetSession = getSession as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;

// Real v4 UUID (Zod v4's uuid() validator is strict about the variant bits).
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

interface ChainCalls {
  table?: string;
  eqs: Array<[string, unknown]>;
}

function makeChain(error: unknown, calls: ChainCalls) {
  const chain = {
    delete: () => chain,
    eq: (col: string, val: unknown) => {
      calls.eqs.push([col, val]);
      return chain;
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ error }).then(resolve),
  } as unknown as Promise<{ error: unknown }> & {
    delete: () => unknown; eq: (c: string, v: unknown) => unknown;
  };
  return chain;
}

const fakeSession = { company: { id: 'company-1' }, member: { id: 'm1' } };

const handler = createScopedDelete('leads');

describe('scoped-delete', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await handler({} as NextRequest, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(res.status).toBe(401);
  });

  test('400 invalid_id when path id is not a UUID', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const res = await handler({} as NextRequest, { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_id');
  });

  test('200 ok and scopes by company_id on success', async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const calls: ChainCalls = { eqs: [] };
    mockCreateAdminClient.mockReturnValue({
      from: (table: string) => {
        calls.table = table;
        return makeChain(null, calls);
      },
    });

    const res = await handler({} as NextRequest, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(res.status).toBe(200);
    expect(calls.table).toBe('leads');
    expect(calls.eqs).toEqual([
      ['id', VALID_UUID],
      ['company_id', 'company-1'],
    ]);
  });

  test('500 generic error and no leak when delete fails', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue(fakeSession);
    const calls: ChainCalls = { eqs: [] };
    mockCreateAdminClient.mockReturnValue({
      from: () => makeChain({ message: 'pg constraint xyz' }, calls),
    });
    const res = await handler({} as NextRequest, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('delete_failed');
    expect(JSON.stringify(body)).not.toContain('pg constraint');
    errSpy.mockRestore();
  });
});
