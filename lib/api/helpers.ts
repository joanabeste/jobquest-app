import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse a JSON request body.
 * Returns `{ ok: true, data }` on success or `{ ok: false, response }` with a 400 on invalid JSON.
 */
export async function parseBody<T>(
  req: NextRequest,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    };
  }
}
