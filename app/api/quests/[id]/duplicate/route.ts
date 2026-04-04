import { createDuplicateRoute } from '@/lib/api/create-duplicate-route';
import { questFromDb } from '@/lib/supabase/mappers';

export const POST = createDuplicateRoute({
  table: 'job_quests',
  fromDb: (row) => questFromDb(row as Parameters<typeof questFromDb>[0]),
  buildCopy: (original, { id, slug, companyId, now }) => ({
    id,
    company_id: companyId,
    title: `${original.title} (Kopie)`,
    slug,
    status: 'draft',
    modules: (original.modules as Record<string, unknown>[]).map((m) => ({ ...m, id: crypto.randomUUID() })),
    lead_config: original.lead_config,
    created_at: now,
    updated_at: now,
  }),
});
