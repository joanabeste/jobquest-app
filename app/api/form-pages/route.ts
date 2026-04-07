import { createContentRoute } from '@/lib/api/create-content-route';
import { formPageFromDb, formPageToDb } from '@/lib/supabase/mappers';
import type { FormPage } from '@/lib/types';

export const { GET, POST } = createContentRoute<FormPage>({
  table: 'form_pages',
  quotaKind: 'formulare',
  quotaLabel: 'Formulare',
  fromDb: formPageFromDb,
  toDb: formPageToDb,
});
