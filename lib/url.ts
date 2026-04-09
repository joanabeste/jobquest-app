import type { Company } from './types';

/**
 * Build a public URL for content.
 * Uses the company's custom domain only when the content item
 * has explicitly opted in via `useCustomDomain`.
 * Falls back to the current origin (SaaS domain).
 */
export function getPublicUrl(
  path: string,
  company?: Pick<Company, 'customDomain' | 'domainVerified'> | null,
  useCustomDomain = false,
): string {
  if (useCustomDomain && company?.customDomain && company.domainVerified) {
    return `https://${company.customDomain}${path}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
