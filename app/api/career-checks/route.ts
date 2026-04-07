import { createContentRoute } from '@/lib/api/create-content-route';
import { careerCheckFromDb, careerCheckToDb } from '@/lib/supabase/mappers';
import type { CareerCheck } from '@/lib/types';

export const { GET, POST } = createContentRoute<CareerCheck>({
  table: 'career_checks',
  quotaKind: 'berufschecks',
  quotaLabel: 'Berufschecks',
  fromDb: careerCheckFromDb,
  toDb: careerCheckToDb,
});
