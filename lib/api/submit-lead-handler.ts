import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendLeadEmails } from '@/lib/mailer';
import type { EmailConfig } from '@/lib/funnel-types';

interface LeadBase {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface SubmitLeadBody<T> {
  lead: T;
  contentId: string;
  companyName: string;
  karriereseiteUrl?: string;
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
    let body: SubmitLeadBody<T>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }
    const { lead, contentId, companyName, karriereseiteUrl } = body;

    const admin = createAdminClient();

    const { error } = await admin.from(table).insert(toDb(lead));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: docRow, error: docErr } = await admin
      .from('funnel_docs')
      .select('email_config')
      .eq('content_id', contentId)
      .single();

    if (!docErr && docRow?.email_config) {
      const emailConfig = docRow.email_config as EmailConfig;
      const emailWillSend = emailConfig.confirmationEnabled || emailConfig.notificationEnabled;
      if (emailWillSend) {
        // Fire email with a hard 8-second timeout — never block the success response
        const EMAIL_TIMEOUT_MS = 8_000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('E-Mail-Timeout nach 8s')), EMAIL_TIMEOUT_MS),
        );
        Promise.race([
          sendLeadEmails({
            emailConfig,
            vars: {
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone ?? '',
              companyName,
              karriereseiteUrl: karriereseiteUrl ?? '',
            },
          }),
          timeoutPromise,
        ])
          .then(() => admin.from(table).update({ email_sent: true }).eq('id', lead.id))
          .catch((err: unknown) => {
            console.error(`[${logPrefix}] E-Mail-Versand fehlgeschlagen:`, err);
          });
      }
    }

    return NextResponse.json({ success: true });
  };
}
