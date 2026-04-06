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

    let emailStatus: 'sent' | 'skipped' | 'error' = 'skipped';
    let emailError: string | undefined;

    const { data: docRow, error: docErr } = await admin
      .from('funnel_docs')
      .select('email_config')
      .eq('content_id', contentId)
      .single();

    if (docErr) {
      console.error(`[${logPrefix}] funnel_docs lookup failed:`, docErr.message);
    }

    if (!docErr && docRow?.email_config) {
      const emailConfig = docRow.email_config as EmailConfig;
      const emailWillSend = emailConfig.confirmationEnabled || emailConfig.notificationEnabled;

      if (!emailWillSend) {
        console.log(`[${logPrefix}] E-Mail nicht aktiviert (confirmation=${emailConfig.confirmationEnabled}, notification=${emailConfig.notificationEnabled})`);
      } else {
        // Check SMTP env vars before attempting
        const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        if (!smtpConfigured) {
          console.error(`[${logPrefix}] SMTP nicht konfiguriert: SMTP_HOST=${!!process.env.SMTP_HOST}, SMTP_USER=${!!process.env.SMTP_USER}, SMTP_PASS=${!!process.env.SMTP_PASS}`);
          emailStatus = 'error';
          emailError = 'SMTP-Umgebungsvariablen nicht gesetzt';
        } else {
          const EMAIL_TIMEOUT_MS = 8_000;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('E-Mail-Timeout nach 8s')), EMAIL_TIMEOUT_MS),
          );
          try {
            console.log(`[${logPrefix}] Sende E-Mail via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? '587'}…`);
            await Promise.race([
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
            ]);
            await admin.from(table).update({ email_sent: true }).eq('id', lead.id);
            emailStatus = 'sent';
            console.log(`[${logPrefix}] E-Mail erfolgreich gesendet`);
          } catch (err: unknown) {
            emailStatus = 'error';
            emailError = err instanceof Error ? err.message : String(err);
            console.error(`[${logPrefix}] E-Mail-Versand fehlgeschlagen:`, emailError);
          }
        }
      }
    }

    return NextResponse.json({ success: true, emailStatus, emailError });
  };
}
