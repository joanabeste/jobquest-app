import { createDuplicateRoute } from '@/lib/api/create-duplicate-route';
import { formPageFromDb } from '@/lib/supabase/mappers';

export const POST = createDuplicateRoute({
  table: 'form_pages',
  fromDb: (row) => formPageFromDb(row as Parameters<typeof formPageFromDb>[0]),
  buildCopy: (original, { id, slug, companyId, now }) => ({
    id,
    company_id: companyId,
    title: `${original.title} (Kopie)`,
    slug,
    status: 'draft',
    content_blocks: original.content_blocks,
    form_steps: original.form_steps,
    form_config: original.form_config,
    created_at: now,
    updated_at: now,
  }),
});
