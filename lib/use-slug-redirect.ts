import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './supabase/client';
import type { EntityType } from './slug-validation';

/**
 * When a slug is not found, checks the slug_redirects table and
 * navigates to the new slug if a redirect exists.
 * Returns true if a redirect was triggered (caller should show nothing).
 */
export function useSlugRedirect(
  slug: string | undefined,
  entityType: EntityType,
  pathPrefix: string,
  notFound: boolean,
): boolean {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!notFound || !slug) return;

    async function checkRedirect() {
      const { data } = await createClient()
        .from('slug_redirects')
        .select('new_slug')
        .eq('old_slug', slug!)
        .eq('entity_type', entityType)
        .maybeSingle();

      if (data?.new_slug) {
        setRedirecting(true);
        router.replace(`${pathPrefix}/${data.new_slug}`);
      }
    }
    checkRedirect();
  }, [notFound, slug, entityType, pathPrefix, router]);

  return redirecting;
}
