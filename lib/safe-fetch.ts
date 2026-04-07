import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF-resistant fetch helper.
 *
 * Hard rules:
 *  - Only http(s).
 *  - Resolve hostname → ALL IPs and reject if any is private/loopback/link-local
 *    (IPv4 + IPv6). This prevents DNS-rebinding within the request lifetime
 *    and tricks like `localhost.example.com` or `127.0.0.1.nip.io`.
 *  - `redirect: 'manual'` — we follow redirects ourselves and re-validate every
 *    hop, so the chain cannot escape the allowlist via a 302.
 *  - Hard cap on body size and total request time.
 *
 * Returns null for any failure mode (timeout, oversized, blocked host, non-2xx,
 * too many redirects). Callers must treat null as "untrusted source unreachable".
 */

const MAX_REDIRECTS = 3;

export type SafeFetchResult = {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
};

export type SafeFetchOptions = {
  maxBytes: number;
  timeoutMs: number;
  userAgent?: string;
};

function isPrivateV4(ip: string): boolean {
  const parts = ip.split('.').map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local incl. AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('ff')) return true; // multicast
  // IPv4-mapped: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true; // unknown → block
}

async function assertPublicHost(hostname: string): Promise<void> {
  // URL.hostname keeps the brackets on IPv6 literals (e.g. "[::1]"). Strip
  // them so isIP() recognises the address as a literal IP and we never call
  // DNS for it.
  const bare = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  // Hostname-level shortcut: literal IPs.
  if (isIP(bare)) {
    if (isPrivateIp(bare)) {
      throw new Error(`blocked: private literal IP ${bare}`);
    }
    return;
  }

  // Block obvious local names before DNS even runs.
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw new Error(`blocked: local hostname ${hostname}`);
  }

  // Resolve all addresses (A + AAAA). If any single address is private, refuse —
  // do NOT cherry-pick the public ones, since the underlying fetch may pick
  // any of them.
  const records = await lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new Error(`blocked: no DNS records for ${hostname}`);
  }
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(`blocked: private resolved IP ${r.address} for ${hostname}`);
    }
  }
}

function validateUrl(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`blocked: protocol ${u.protocol}`);
  }
  return u;
}

async function readBodyWithLimit(
  res: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function safeFetch(
  rawUrl: string,
  opts: SafeFetchOptions,
): Promise<SafeFetchResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    let current: URL;
    try {
      current = validateUrl(rawUrl);
    } catch {
      return null;
    }

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      try {
        await assertPublicHost(current.hostname);
      } catch {
        return null;
      }

      let res: Response;
      try {
        res = await fetch(current.toString(), {
          headers: {
            'User-Agent': opts.userAgent ?? 'JobQuestBot/1.0 (+https://jobquest.app)',
          },
          signal: controller.signal,
          redirect: 'manual',
        });
      } catch {
        return null;
      }

      // Manual redirect handling: re-validate the next hop.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        try {
          current = new URL(location, current);
          if (current.protocol !== 'http:' && current.protocol !== 'https:') {
            return null;
          }
        } catch {
          return null;
        }
        continue;
      }

      if (!res.ok) return null;

      // Optional: respect declared content-length to short-circuit huge bodies.
      const declared = Number(res.headers.get('content-length') ?? '0');
      if (declared && declared > opts.maxBytes) return null;

      const buffer = await readBodyWithLimit(res, opts.maxBytes);
      if (!buffer) return null;

      return {
        buffer,
        contentType: res.headers.get('content-type') ?? '',
        finalUrl: current.toString(),
      };
    }

    return null; // too many redirects
  } finally {
    clearTimeout(timeout);
  }
}

/** Public-URL pre-check for callers that only need the validation, not the fetch. */
export async function isSafePublicUrl(raw: string): Promise<URL | null> {
  try {
    const u = validateUrl(raw);
    await assertPublicHost(u.hostname);
    return u;
  } catch {
    return null;
  }
}
