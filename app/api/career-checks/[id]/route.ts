import { createCrudRoute } from '@/lib/api/create-crud-route';
import { careerCheckFromDb, careerCheckToDb } from '@/lib/supabase/mappers';
import type { CareerCheck } from '@/lib/types';

export const { GET, PUT, DELETE } = createCrudRoute<CareerCheck>({
  table: 'career_checks',
  fromDb: (row) => careerCheckFromDb(row as Parameters<typeof careerCheckFromDb>[0]),
  toDb: (item) => careerCheckToDb(item) as Record<string, unknown>,
});
