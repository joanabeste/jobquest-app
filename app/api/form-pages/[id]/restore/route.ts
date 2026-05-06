import { createTrashRoute } from '@/lib/api/create-trash-route';

export const { POST } = createTrashRoute({
  table: 'form_pages',
  quotaKind: 'formulare',
  quotaLabel: 'Formulare',
});
