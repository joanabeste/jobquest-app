import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setImpersonation } from '@/lib/impersonation';

const MAX_AGE_MS = 60 * 1000; // Token gültig für 60 Sekunden

/**
 * GET /api/admin/impersonate/start?companyId=...&ts=...&sig=...
 *
 * Wird vom JobQuest Hub aufgerufen (Redirect).
 * Verifiziert die HMAC-Signatur, setzt den Impersonation-Cookie
 * und leitet zum Dashboard weiter.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get('companyId');
  const ts = searchParams.get('ts');
  const sig = searchParams.get('sig');

  if (!companyId || !ts || !sig) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Zeitstempel prüfen (max 60s alt)
  const age = Date.now() - Number(ts);
  if (isNaN(age) || age < 0 || age > MAX_AGE_MS) {
    return NextResponse.json({ error: 'Token expired' }, { status: 403 });
  }

  // Signatur prüfen
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const expected = crypto.createHmac('sha256', secret).update(`${companyId}:${ts}`).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Firma laden
  const admin = createAdminClient();
  const { data: company } = await admin
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Cookie setzen
  await setImpersonation({ companyId: company.id, companyName: company.name });

  // Zum Dashboard weiterleiten
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${siteUrl}/dashboard`);
}
