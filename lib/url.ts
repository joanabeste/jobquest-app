import type { Company } from './types';

/**
 * Build a public URL for content. Uses the company's custom domain
 * if one is verified, otherwise falls back to the current origin.
 */
export function getPublicUrl(
  path: string,
  company?: Pick<Company, 'customDomain' | 'domainVerified'> | null,
): string {
  if (company?.customDomain && company.domainVerified) {
    return `https://${company.customDomain}${path}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
