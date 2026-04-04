import { createSubmitLeadHandler } from '@/lib/api/submit-lead-handler';
import { careerCheckLeadToDb } from '@/lib/supabase/mappers';
import type { CareerCheckLead } from '@/lib/types';

export const POST = createSubmitLeadHandler<CareerCheckLead>(
  'career_check_leads',
  (lead) => careerCheckLeadToDb(lead) as Record<string, unknown>,
  'submit-career-check-lead',
);
