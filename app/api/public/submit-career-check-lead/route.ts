import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { careerCheckLeadToDb } from '@/lib/supabase/mappers';
import { sendLeadEmails } from '@/lib/mailer';
import type { CareerCheckLead } from '@/lib/types';
import type { EmailConfig } from '@/lib/funnel-types';

export async function POST(req: NextRequest) {
  const { lead, contentId, companyName }: {
    lead: CareerCheckLead;
    contentId: string;
    companyName: string;
  } = await req.json();

  const admin = createAdminClient();

  // 1. Lead speichern
  const { error } = await admin.from('career_check_leads').insert(careerCheckLeadToDb(lead));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. EmailConfig aus FunnelDoc laden (contentId = careerCheckId)
  const { data: docRow } = await admin
    .from('funnel_docs')
    .select('email_config')
    .eq('content_id', contentId)
    .single();

  // 3. E-Mails senden
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
      console.error('[submit-career-check-lead] E-Mail-Versand fehlgeschlagen:', err);
    }
  }

  return NextResponse.json({ success: true });
}
