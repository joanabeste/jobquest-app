import { createCrudRoute } from '@/lib/api/create-crud-route';
import { questFromDb, questToDb } from '@/lib/supabase/mappers';
import type { JobQuest } from '@/lib/types';

export const { GET, PUT, DELETE } = createCrudRoute<JobQuest>({
  table: 'job_quests',
  fromDb: (row) => questFromDb(row as Parameters<typeof questFromDb>[0]),
  toDb: (item) => questToDb(item) as Record<string, unknown>,
});
