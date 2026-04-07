import { z } from 'zod';
import { createSubmitLeadHandler } from '@/lib/api/submit-lead-handler';
import { leadToDb } from '@/lib/supabase/mappers';
import type { Lead } from '@/lib/types';

// Validate the public lead payload at the boundary. Unknown fields are
// stripped by Zod and will never reach the DB mapper.
const LeadSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  // Funnel answer payload — keep loose; structure is defined by the funnel
  // editor and validated cosmetically. Tightening is tracked in PR7.
  answers: z.record(z.string(), z.unknown()).optional(),
  contentId: z.string().min(1).max(200).optional(),
  createdAt: z.string().datetime().optional(),
}).passthrough() as unknown as z.ZodType<Lead>;

export const POST = createSubmitLeadHandler<Lead>(
  'leads',
  LeadSchema,
  (lead) => leadToDb(lead) as Record<string, unknown>,
  'submit-lead',
);
