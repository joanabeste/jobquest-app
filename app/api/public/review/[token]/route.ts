import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { commentFromDb, funnelDocFromDb, reviewLinkFromDb } from '@/lib/supabase/mappers';

// Validiert einen Review-Token und lädt Doc + Kommentare für die externe Ansicht.
// Keine Session erforderlich — Zugriff erfolgt ausschließlich über den Token.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: linkRow } = await admin
    .from('review_links')
    .select('*')
    .eq('token', token)
    .single();

  if (!linkRow) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }

  const link = reviewLinkFromDb(linkRow);
  if (link.revokedAt) {
    return NextResponse.json({ error: 'revoked' }, { status: 410 });
  }
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const { data: docRow } = await admin
    .from('funnel_docs')
    .select('*')
    .eq('id', link.funnelDocId)
    .single();

  if (!docRow) {
    return NextResponse.json({ error: 'doc_missing' }, { status: 404 });
  }

  const { data: commentRows } = await admin
    .from('funnel_comments')
    .select('*')
    .eq('funnel_doc_id', link.funnelDocId)
    .order('created_at', { ascending: true });

  // Firmen-Infos fürs Corporate Design auf der Review-Seite
  const { data: companyRow } = await admin
    .from('companies')
    .select('id, name, logo, corporate_design')
    .eq('id', link.companyId)
    .single();

  return NextResponse.json({
    link: {
      id: link.id,
      label: link.label,
      canComment: link.canComment,
      expiresAt: link.expiresAt,
    },
    doc: funnelDocFromDb(docRow),
    comments: (commentRows ?? []).map(commentFromDb),
    company: companyRow ? {
      id: companyRow.id,
      name: companyRow.name,
      logo: companyRow.logo,
      corporateDesign: companyRow.corporate_design,
    } : null,
  });
}
