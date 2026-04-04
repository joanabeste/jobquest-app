import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendLeadEmails } from '@/lib/mailer';
import type { EmailConfig } from '@/lib/funnel-types';

interface LeadBase {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface SubmitLeadBody<T> {
  lead: T;
  contentId: string;
  companyName: string;
}

/**
 * Shared handler for lead submission routes.
 * Saves the lead to the given table, then fires emails from the funnel_docs config.
 */
export function createSubmitLeadHandler<T extends LeadBase>(
  table: string,
  toDb: (lead: T) => Record<string, unknown>,
  logPrefix: string,
) {
  return async function POST(req: NextRequest) {
    const { lead, contentId, companyName }: SubmitLeadBody<T> = await req.json();

    const admin = createAdminClient();

    const { error } = await admin.from(table).insert(toDb(lead));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: docRow } = await admin
      .from('funnel_docs')
      .select('email_config')
      .eq('content_id', contentId)
      .single();

    if (docRow?.email_config) {
      try {
        await sendLeadEmails({
          emailConfig: docRow.email_config as EmailConfig,
          vars: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone ?? '',
            companyName,
          },
        });
      } catch (err) {
        console.error(`[${logPrefix}] E-Mail-Versand fehlgeschlagen:`, err);
      }
    }

    return NextResponse.json({ success: true });
  };
}
