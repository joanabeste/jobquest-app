import { createContentRoute } from '@/lib/api/create-content-route';
import { questFromDb, questToDb } from '@/lib/supabase/mappers';
import type { JobQuest } from '@/lib/types';

export const { GET, POST } = createContentRoute<JobQuest>({
  table: 'job_quests',
  quotaKind: 'jobquests',
  quotaLabel: 'JobQuests',
  fromDb: questFromDb,
  toDb: questToDb,
});
