import { NextRequest, NextResponse } from 'next/server';
import { z, type ZodType } from 'zod';
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

// Restrict `table` to a closed union so a caller cannot accidentally (or
// maliciously, via a future code change) point this at an unrelated table.
type LeadTable = 'leads' | 'career_check_leads';

const SubmitLeadEnvelopeSchema = z.object({
  contentId: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200),
  karriereseiteUrl: z.string().url().max(2000).optional(),
});

/**
 * Shared handler for public lead-submission routes.
 *
 * Validation strategy:
 *  - Envelope (contentId / companyName / karriereseiteUrl) is validated here.
 *  - The `lead` payload is validated by a caller-supplied Zod schema so that
 *    each lead variant can enforce its own field set. Unknown fields are
 *    stripped, never passed through to the DB mapper.
 *
 * Errors are returned as generic messages — Supabase errors are logged
 * server-side only.
 */
export function createSubmitLeadHandler<T extends LeadBase>(
  table: LeadTable,
  leadSchema: ZodType<T>,
  toDb: (lead: T) => Record<string, unknown>,
  logPrefix: string,
) {
  return async function POST(req: NextRequest) {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const envelope = SubmitLeadEnvelopeSchema.safeParse(raw);
    if (!envelope.success) {
      return NextResponse.json({ error: 'validation_error' }, { status: 400 });
    }
    const leadParsed = leadSchema.safeParse((raw as { lead?: unknown })?.lead);
    if (!leadParsed.success) {
      return NextResponse.json({ error: 'validation_error' }, { status: 400 });
    }
    const lead = leadParsed.data;
    const { contentId, companyName, karriereseiteUrl } = envelope.data;

    const admin = createAdminClient();

    const { error } = await admin.from(table).insert(toDb(lead));
    if (error) {
      console.error(`[${logPrefix}] insert failed:`, error.message);
      return NextResponse.json({ error: 'submit_failed' }, { status: 500 });
    }

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
