import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { setImpersonation } from '@/lib/impersonation';

const MAX_AGE_MS = 60 * 1000; // Token gültig für 60 Sekunden
const UuidSchema = z.string().uuid();

/**
 * GET /api/admin/impersonate/start?companyId=...&ts=...&sig=...
 *
 * Wird vom JobQuest Hub aufgerufen (Redirect).
 * Verifiziert die HMAC-Signatur, setzt den Impersonation-Cookie und leitet
 * zum Dashboard weiter.
 *
 * Sicherheitshinweise:
 *  - `crypto.timingSafeEqual` wirft bei unterschiedlich langen Buffern, also
 *    LÄNGE zuerst prüfen — sonst kann ein Angreifer den Handler durch ein
 *    falsch dimensioniertes `sig` zum Crashen / 500-Leak bringen.
 *  - Signatur und erwarteter Hash werden hex-dekodiert (nicht als utf-8
 *    interpretiert), bevor sie verglichen werden.
 *  - Bevorzugt `IMPERSONATION_HMAC_SECRET`. Fällt aus Kompat-Gründen auf
 *    `SUPABASE_SERVICE_ROLE_KEY` zurück; sobald der Hub aktualisiert ist,
 *    sollte der Fallback entfernt werden, damit der Service-Role-Key kein
 *    Doppelleben mehr führt.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get('companyId');
  const ts = searchParams.get('ts');
  const sig = searchParams.get('sig');

  if (!companyId || !ts || !sig) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  if (!UuidSchema.safeParse(companyId).success) {
    return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
  }

  // Zeitstempel prüfen (max 60s alt)
  const age = Date.now() - Number(ts);
  if (isNaN(age) || age < 0 || age > MAX_AGE_MS) {
    return NextResponse.json({ error: 'Token expired' }, { status: 403 });
  }

  // Hex-Signatur strikt validieren — alles andere wird abgelehnt, bevor es
  // crypto.* erreicht.
  if (!/^[0-9a-f]{64}$/i.test(sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const secret =
    process.env.IMPERSONATION_HMAC_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    console.error('[impersonate/start] no HMAC secret configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${companyId}:${ts}`)
    .digest(); // raw bytes
  const provided = Buffer.from(sig, 'hex');

  // Length check BEFORE timingSafeEqual — otherwise it throws.
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
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
