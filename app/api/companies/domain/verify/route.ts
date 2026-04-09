import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { addDomain, verifyDomain } from '@/lib/vercel-domains';

/** POST — verify DNS and add domain to Vercel */
export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('custom_domain, domain_verified')
    .eq('id', session.company.id)
    .single();

  if (!company?.custom_domain) {
    return NextResponse.json({ error: 'Keine Domain konfiguriert.' }, { status: 400 });
  }

  if (company.domain_verified) {
    return NextResponse.json({ verified: true, domain: company.custom_domain });
  }

  try {
    // Add to Vercel project (idempotent — safe to call again)
    await addDomain(company.custom_domain);

    // Trigger Vercel DNS verification
    const info = await verifyDomain(company.custom_domain);

    if (!info.verified) {
      return NextResponse.json({
        verified: false,
        domain: company.custom_domain,
        reason: 'DNS-Eintrag noch nicht erkannt. Bitte prüfe deine DNS-Einstellungen und versuche es in einigen Minuten erneut.',
      });
    }

    // Mark as verified in database
    const { error } = await supabase
      .from('companies')
      .update({ domain_verified: true })
      .eq('id', session.company.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ verified: true, domain: company.custom_domain });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vercel-API-Fehler';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
