import { createDuplicateRoute } from '@/lib/api/create-duplicate-route';
import { careerCheckFromDb } from '@/lib/supabase/mappers';

export const POST = createDuplicateRoute({
  table: 'career_checks',
  fromDb: (row) => careerCheckFromDb(row as Parameters<typeof careerCheckFromDb>[0]),
  buildCopy: (original, { id, slug, companyId, now }) => ({
    id,
    company_id: companyId,
    title: `${original.title} (Kopie)`,
    slug,
    status: 'draft',
    blocks: (original.blocks as Record<string, unknown>[]).map((b) => ({ ...b, id: crypto.randomUUID() })),
    dimensions: original.dimensions,
    created_at: now,
    updated_at: now,
  }),
});
