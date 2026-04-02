import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { memberFromDb } from '@/lib/supabase/mappers';
import { can } from '@/lib/types';
import { sendInviteEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!can(session.member.role, 'manage_members')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, email, role } = await req.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email and role are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Generate invite link without Supabase sending the email
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${siteUrl}/accept-invite` },
  });
  if (linkError || !linkData.user) {
    console.error('[invite] generateLink', linkError);
    return NextResponse.json({ error: 'Invite failed' }, { status: 500 });
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
    return NextResponse.json({ error: 'Invite failed' }, { status: 500 });
  }

  // Send invite email via our own SMTP
  const inviteLink = linkData.properties.action_link;
  console.log('\n[invite] Invite-Link generiert:', inviteLink, '\n');

  let emailSent = false;
  try {
    await sendInviteEmail({
      to: email,
      invitedBy: session.member.name,
      companyName: session.company.name,
      inviteLink,
    });
    emailSent = true;
    console.log('[invite] E-Mail erfolgreich gesendet an', email);
  } catch (mailErr) {
    console.error('[invite] E-Mail-Versand fehlgeschlagen:', mailErr);
  }

  return NextResponse.json({
    member: memberFromDb(data!),
    // Return link when email couldn't be sent so the UI can show it
    inviteLink: emailSent ? undefined : inviteLink,
  });
}
