import { createSubmitLeadHandler } from '@/lib/api/submit-lead-handler';
import { leadToDb } from '@/lib/supabase/mappers';
import type { Lead } from '@/lib/types';

export const POST = createSubmitLeadHandler<Lead>(
  'leads',
  (lead) => leadToDb(lead) as Record<string, unknown>,
  'submit-lead',
);
