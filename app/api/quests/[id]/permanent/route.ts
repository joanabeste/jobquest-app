import { createTrashRoute } from '@/lib/api/create-trash-route';

export const { DELETE } = createTrashRoute({
  table: 'job_quests',
  quotaKind: 'jobquests',
  quotaLabel: 'JobQuests',
});
