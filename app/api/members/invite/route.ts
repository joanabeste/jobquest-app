import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import { can } from '@/lib/types';
import { sendInviteEmail } from '@/lib/mailer';
import { parseBody } from '@/lib/api/helpers';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!can(session.member.role, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await parseBody<{ name: string; email: string; role: string }>(req);
  if (!parsed.ok) return parsed.response;
  const { name, email, role } = parsed.data;
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, E-Mail und Rolle sind Pflichtfelder.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if email already exists as a member in this company
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('id, status')
    .eq('email', email.toLowerCase())
    .eq('company_id', session.company.id)
    .single();

  if (existingMember) {
    const msg = existingMember.status === 'pending'
      ? 'Diese Person hat bereits eine ausstehende Einladung.'
      : 'Diese Person ist bereits Mitglied im Team.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Generate invite link without Supabase sending the email
  type LinkResult = { user: { id: string }; properties: { action_link: string } };
  let linkData: LinkResult | null = null;

  const { data: genData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${siteUrl}/accept-invite` },
  });

  if (genData?.user) {
    linkData = genData as unknown as LinkResult;
  } else if (linkError) {
    const msg = linkError.message ?? '';
    // User exists in auth but not in workspace_members (e.g. previously deleted member)
    // → Delete the orphaned auth user and retry with a fresh invite
    if (msg.includes('already') || msg.includes('exist')) {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === email.toLowerCase());
      if (existingUser) {
        await admin.auth.admin.deleteUser(existingUser.id);
        const { data: retryData } = await admin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { redirectTo: `${siteUrl}/accept-invite` },
        });
        if (retryData?.user) {
          linkData = retryData as unknown as LinkResult;
        }
      }
    }

    if (!linkData) {
      console.error('[invite] generateLink', linkError);
      return NextResponse.json({ error: `Einladung fehlgeschlagen: ${msg || 'Unbekannter Fehler'}` }, { status: 500 });
    }
  }

  if (!linkData) {
    return NextResponse.json({ error: 'Einladung fehlgeschlagen.' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('workspace_members')
    .upsert(
      {
        id: linkData.user.id,
        company_id: session.company.id,
        name,
        email,
        role,
        invited_by: session.member.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) {
    await admin.auth.admin.deleteUser(linkData.user.id);
    console.error('[invite] member upsert', error);
    return NextResponse.json({ error: `Einladung fehlgeschlagen: ${error.message}` }, { status: 500 });
  }

  // Send invite email via our own SMTP
  const inviteLink = linkData.properties.action_link;

  let emailSent = false;
  try {
    await sendInviteEmail({
      to: email,
      invitedBy: session.member.name,
      companyName: session.company.name,
      inviteLink,
    });
    emailSent = true;
  } catch (mailErr) {
    console.error('[invite] E-Mail-Versand fehlgeschlagen:', mailErr);
  }

  return NextResponse.json({
    member: memberFromDb(data),
    inviteLink: emailSent ? undefined : inviteLink,
  });
}
