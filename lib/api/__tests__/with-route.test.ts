/**
 * Tests for the generic route wrapper.
 */

import { z } from 'zod';
import { withRoute } from '../with-route';
import type { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;

function makeReq(body: unknown, method = 'POST'): NextRequest {
  return {
    method,
    json: async () => body,
  } as unknown as NextRequest;
}

const Schema = z.object({ name: z.string().min(1), age: z.number().int().min(0) });

describe('withRoute — body validation', () => {
  test('400 invalid_json on malformed body', async () => {
    const handler = withRoute({
      body: Schema,
      handler: async () => new Response('ok') as never,
    });
    const req = {
      json: async () => { throw new Error('boom'); },
    } as unknown as NextRequest;
    const res = await handler(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('invalid_json');
  });

  test('400 validation_error on schema mismatch', async () => {
    const handler = withRoute({
      body: Schema,
      handler: async () => new Response('ok') as never,
    });
    const res = await handler(makeReq({ name: '', age: -5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('validation_error');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  test('passes parsed body to handler on success', async () => {
    const seen: Array<{ name: string; age: number }> = [];
    const handler = withRoute({
      body: Schema,
      handler: async ({ body }) => {
        seen.push(body);
        return new Response(JSON.stringify({ ok: true })) as never;
      },
    });
    const res = await handler(makeReq({ name: 'Lia', age: 30 }));
    expect(res.status).toBe(200);
    expect(seen).toEqual([{ name: 'Lia', age: 30 }]);
  });
});

describe('withRoute — auth', () => {
  test('401 when auth: user and no session', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const handler = withRoute({
      auth: 'user',
      handler: async () => new Response('ok') as never,
    });
    const res = await handler(makeReq(undefined, 'GET'));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('unauthorized');
  });

  test('hands user to handler when authenticated', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    });
    const seen: Array<unknown> = [];
    const handler = withRoute({
      auth: 'user',
      handler: async ({ user }) => {
        seen.push(user);
        return new Response('ok') as never;
      },
    });
    const res = await handler(makeReq(undefined, 'GET'));
    expect(res.status).toBe(200);
    expect((seen[0] as { id: string }).id).toBe('u1');
  });
});

describe('withRoute — error envelope', () => {
  test('500 with safe message when handler throws', async () => {
    // Silence the intentional error-log so the test output stays clean.
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = withRoute({
      handler: async () => {
        throw new Error('internal secret detail');
      },
    });
    const res = await handler(makeReq(undefined, 'GET'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('server_error');
    // Crucially: the leaked detail must NOT be in the response.
    expect(JSON.stringify(body)).not.toContain('internal secret detail');
    errSpy.mockRestore();
  });
});
