import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { leadToDb } from '@/lib/supabase/mappers';
import { sendLeadEmails } from '@/lib/mailer';
import type { Lead } from '@/lib/types';
import type { EmailConfig } from '@/lib/funnel-types';

export async function POST(req: NextRequest) {
  const { lead, contentId, companyName }: {
    lead: Lead;
    contentId: string;
    companyName: string;
  } = await req.json();

  const admin = createAdminClient();

  // 1. Lead speichern
  const { error } = await admin.from('leads').insert(leadToDb(lead));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. EmailConfig aus FunnelDoc laden
  const { data: docRow } = await admin
    .from('funnel_docs')
    .select('email_config')
    .eq('content_id', contentId)
    .single();

  // 3. E-Mails senden (Fehler beim Senden blockieren nicht die Antwort)
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
      console.error('[submit-lead] E-Mail-Versand fehlgeschlagen:', err);
    }
  }

  return NextResponse.json({ success: true });
}
