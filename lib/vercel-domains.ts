/**
 * Vercel Domain Management API wrapper.
 *
 * Requires env vars:
 *  - VERCEL_API_TOKEN: Personal access token or team token
 *  - VERCEL_PROJECT_ID: Project ID to add domains to
 *  - VERCEL_TEAM_ID (optional): Team ID if using team scope
 */

const VERCEL_API = 'https://api.vercel.com';

function headers() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error('VERCEL_API_TOKEN is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function projectUrl(path = '') {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error('VERCEL_PROJECT_ID is not set');
  const teamId = process.env.VERCEL_TEAM_ID;
  const teamParam = teamId ? `?teamId=${teamId}` : '';
  return `${VERCEL_API}/v10/projects/${projectId}/domains${path}${teamParam}`;
}

export interface VercelDomainInfo {
  name: string;
  verified: boolean;
  configured: boolean;
  error?: string;
}

/** Add a custom domain to the Vercel project. */
export async function addDomain(domain: string): Promise<VercelDomainInfo> {
  const res = await fetch(projectUrl(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Vercel API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    name: data.name,
    verified: data.verified ?? false,
    configured: data.configured ?? false,
  };
}

/** Remove a custom domain from the Vercel project. */
export async function removeDomain(domain: string): Promise<void> {
  const res = await fetch(projectUrl(`/${encodeURIComponent(domain)}`), {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Vercel API error: ${res.status}`);
  }
}

/** Get configuration/verification status of a domain. */
export async function getDomainConfig(domain: string): Promise<VercelDomainInfo | null> {
  const res = await fetch(projectUrl(`/${encodeURIComponent(domain)}`), {
    method: 'GET',
    headers: headers(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Vercel API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    name: data.name,
    verified: data.verified ?? false,
    configured: data.configured ?? false,
  };
}

/**
 * Verify a domain on Vercel (triggers DNS check).
 * Returns the updated domain info.
 */
export async function verifyDomain(domain: string): Promise<VercelDomainInfo> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}/verify${process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''}`, {
    method: 'POST',
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Vercel API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    name: data.name,
    verified: data.verified ?? false,
    configured: data.configured ?? false,
  };
}
