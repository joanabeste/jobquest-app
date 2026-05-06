import { createTrashRoute } from '@/lib/api/create-trash-route';

export const { DELETE } = createTrashRoute({
  table: 'form_pages',
  quotaKind: 'formulare',
  quotaLabel: 'Formulare',
});
