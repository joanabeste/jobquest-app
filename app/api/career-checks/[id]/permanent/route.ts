import { createTrashRoute } from '@/lib/api/create-trash-route';

export const { DELETE } = createTrashRoute({
  table: 'career_checks',
  quotaKind: 'berufschecks',
  quotaLabel: 'Berufschecks',
});
