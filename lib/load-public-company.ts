import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyFromDb } from '@/lib/supabase/mappers';
import type { Company } from '@/lib/types';

/**
 * Lädt eine veröffentlichte Content-Row (Berufscheck / Formular / JobQuest)
 * anhand des Slugs samt zugehöriger Company. In React `cache()` gewrappt, damit
 * sich `generateMetadata()` und die Page-Komponente innerhalb desselben
 * Server-Renders denselben DB-Treffer teilen (keine doppelten Queries).
 *
 * Dedup-Voraussetzung: beide Aufrufe übergeben identische Argumente — also auch
 * denselben `contentSelect`-String.
 */
export const loadPublishedContentWithCompany = cache(async (
  table: 'career_checks' | 'form_pages' | 'job_quests',
  slug: string,
  contentSelect: string,
): Promise<{ row: Record<string, unknown>; company: Company | null } | null> => {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from(table)
    .select(contentSelect)
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();
  if (!row) return null;
  // Dynamischer (nicht-literaler) Select → supabase-js kann den Row-Typ nicht
  // ableiten; bewusst über unknown casten.
  const typedRow = row as unknown as Record<string, unknown>;
  const companyId = typedRow.company_id as string;
  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  return { row: typedRow, company: companyRow ? companyFromDb(companyRow) : null };
});

/** Showcase `/c`: Company direkt über ihren eigenen Slug — ebenfalls dedupliziert. */
export const loadCompanyBySlug = cache(async (slug: string): Promise<Company | null> => {
  const supabase = createAdminClient();
  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();
  return companyRow ? companyFromDb(companyRow) : null;
});
