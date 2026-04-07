/**
 * Tests for the SSRF-resistant fetch helper.
 *
 * Strategy: stub global `fetch` and the DNS lookup. We can't (and shouldn't)
 * make real network calls — the helper's whole job is to refuse them when
 * they would touch private space, so the tests assert exactly that.
 */

import { safeFetch, isSafePublicUrl } from '../safe-fetch';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

import { lookup } from 'node:dns/promises';
const mockLookup = lookup as jest.Mock;

const realFetch = global.fetch;
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

function bodyOf(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(enc.encode(text));
      ctrl.close();
    },
  });
}

function okResponse(text = 'hello', headers: Record<string, string> = { 'content-type': 'text/html' }): Response {
  return new Response(bodyOf(text), { status: 200, headers });
}

// ─── isSafePublicUrl ─────────────────────────────────────────────────────────

describe('isSafePublicUrl', () => {
  test('rejects non-http(s) protocols', async () => {
    expect(await isSafePublicUrl('file:///etc/passwd')).toBeNull();
    expect(await isSafePublicUrl('javascript:alert(1)')).toBeNull();
    expect(await isSafePublicUrl('gopher://example.com')).toBeNull();
  });

  test('rejects localhost variants without DNS', async () => {
    expect(await isSafePublicUrl('http://localhost/x')).toBeNull();
    expect(await isSafePublicUrl('http://foo.localhost/x')).toBeNull();
    expect(await isSafePublicUrl('http://printer.local/x')).toBeNull();
    expect(mockLookup).not.toHaveBeenCalled();
  });

  test('rejects literal private IPs without DNS', async () => {
    expect(await isSafePublicUrl('http://127.0.0.1/x')).toBeNull();
    expect(await isSafePublicUrl('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(await isSafePublicUrl('http://10.0.0.1/x')).toBeNull();
    expect(await isSafePublicUrl('http://192.168.1.1/x')).toBeNull();
    expect(await isSafePublicUrl('http://172.16.0.1/x')).toBeNull();
    expect(await isSafePublicUrl('http://100.64.0.1/x')).toBeNull(); // CGNAT
    expect(await isSafePublicUrl('http://[::1]/x')).toBeNull();
    expect(await isSafePublicUrl('http://[fe80::1]/x')).toBeNull();
    expect(await isSafePublicUrl('http://[fd00::1]/x')).toBeNull(); // ULA
    expect(mockLookup).not.toHaveBeenCalled();
  });

  test('rejects DNS-rebinding-style hostnames whose A record is private', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    expect(await isSafePublicUrl('http://localhost.example.com/x')).toBeNull();
    expect(mockLookup).toHaveBeenCalled();
  });

  test('rejects when ANY resolved address is private (mixed responses)', async () => {
    mockLookup.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    expect(await isSafePublicUrl('http://example.com/x')).toBeNull();
  });

  test('accepts a clean public host', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const result = await isSafePublicUrl('https://example.com/path');
    expect(result).not.toBeNull();
    expect(result?.hostname).toBe('example.com');
  });
});

// ─── safeFetch ───────────────────────────────────────────────────────────────

describe('safeFetch', () => {
  test('returns null when host validation fails', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);
    const res = await safeFetch('http://example.com/', { maxBytes: 1000, timeoutMs: 1000 });
    expect(res).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('returns body on a public 200', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockFetch.mockResolvedValue(okResponse('<html>hi</html>'));
    const res = await safeFetch('https://example.com/', { maxBytes: 1000, timeoutMs: 1000 });
    expect(res).not.toBeNull();
    expect(res!.contentType).toBe('text/html');
    expect(res!.buffer.toString()).toBe('<html>hi</html>');
  });

  test('refuses oversized response via content-length pre-check', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockFetch.mockResolvedValue(
      new Response(bodyOf('x'), {
        status: 200,
        headers: { 'content-type': 'text/html', 'content-length': '999999' },
      }),
    );
    const res = await safeFetch('https://example.com/', { maxBytes: 100, timeoutMs: 1000 });
    expect(res).toBeNull();
  });

  test('refuses oversized response via streaming guard', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockFetch.mockResolvedValue(okResponse('x'.repeat(2000)));
    const res = await safeFetch('https://example.com/', { maxBytes: 100, timeoutMs: 1000 });
    expect(res).toBeNull();
  });

  test('re-validates each redirect hop and refuses redirect to private IP', async () => {
    mockLookup
      // 1st hop: example.com → public
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      // 2nd hop: attacker.example → private
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);

    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'https://attacker.example/' } }),
    );

    const res = await safeFetch('https://example.com/', { maxBytes: 1000, timeoutMs: 1000 });
    expect(res).toBeNull();
    // The 2nd-hop fetch must NEVER be called.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('refuses redirect to non-http(s) scheme', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } }),
    );
    const res = await safeFetch('https://example.com/', { maxBytes: 1000, timeoutMs: 1000 });
    expect(res).toBeNull();
  });

  test('returns null on non-2xx terminal status', async () => {
    mockLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockFetch.mockResolvedValue(new Response('nope', { status: 500 }));
    const res = await safeFetch('https://example.com/', { maxBytes: 1000, timeoutMs: 1000 });
    expect(res).toBeNull();
  });
});
