import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { addDomain, removeDomain } from '@/lib/vercel-domains';
import { v4 as uuidv4 } from 'uuid';

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** POST — set a custom domain for the company */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const domain = (body.domain as string)?.trim().toLowerCase();

  if (!domain || !DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: 'Ungültiges Domain-Format.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check if domain is already taken by another company
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('custom_domain', domain)
    .neq('id', session.company.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Diese Domain ist bereits vergeben.' }, { status: 409 });
  }

  // Generate a verification token
  const verificationToken = uuidv4();

  // Save domain (unverified)
  const { error } = await supabase
    .from('companies')
    .update({
      custom_domain: domain,
      domain_verified: false,
      domain_verification_token: verificationToken,
    })
    .eq('id', session.company.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    domain,
    verified: false,
    verificationToken,
    dnsInstructions: {
      type: 'CNAME',
      name: domain,
      value: 'cname.vercel-dns.com',
      note: `Erstelle einen CNAME-Eintrag für "${domain}" der auf "cname.vercel-dns.com" zeigt.`,
    },
  });
}

/** DELETE — remove the custom domain */
export async function DELETE() {
  const session = await getSession();
  if (!session) return unauthorized();

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('custom_domain')
    .eq('id', session.company.id)
    .single();

  if (company?.custom_domain) {
    // Remove from Vercel (best-effort)
    try {
      await removeDomain(company.custom_domain);
    } catch {
      // Domain might not exist in Vercel yet — ignore
    }
  }

  const { error } = await supabase
    .from('companies')
    .update({
      custom_domain: null,
      domain_verified: false,
      domain_verification_token: null,
    })
    .eq('id', session.company.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
