import { z } from 'zod';
import { createSubmitLeadHandler } from '@/lib/api/submit-lead-handler';
import { careerCheckLeadToDb } from '@/lib/supabase/mappers';
import type { CareerCheckLead } from '@/lib/types';

const CareerCheckLeadSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  // Result/answer payload owned by the career-check editor — kept loose at the
  // boundary, mapper handles persistence shape. Tightening tracked in PR7.
}).passthrough() as unknown as z.ZodType<CareerCheckLead>;

export const POST = createSubmitLeadHandler<CareerCheckLead>(
  'career_check_leads',
  CareerCheckLeadSchema,
  (lead) => careerCheckLeadToDb(lead) as Record<string, unknown>,
  'submit-career-check-lead',
);
