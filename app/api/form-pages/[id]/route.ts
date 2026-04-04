import { createCrudRoute } from '@/lib/api/create-crud-route';
import { formPageFromDb, formPageToDb } from '@/lib/supabase/mappers';
import type { FormPage } from '@/lib/types';

export const { GET, PUT, DELETE } = createCrudRoute<FormPage>({
  table: 'form_pages',
  fromDb: (row) => formPageFromDb(row as Parameters<typeof formPageFromDb>[0]),
  toDb: (item) => formPageToDb(item) as Record<string, unknown>,
});
