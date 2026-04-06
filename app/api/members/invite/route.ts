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

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectTo = `${origin}/accept-invite`;

  // ── Step 1: Ensure auth user exists (without triggering Supabase auto-emails) ──
  // Try createUser first (no email sent). If user already exists, find and reuse them.
  let userId: string;

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    email_confirm: true, // auto-confirm, no confirmation email
  });

  if (newUser?.user) {
    userId = newUser.user.id;
    console.log(`[invite] Created new auth user ${userId}`);
  } else {
    // User already exists in auth — find their ID
    console.log(`[invite] createUser failed (${createErr?.message}), looking up existing user`);
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u) => u.email === email.toLowerCase());
    if (!existing) {
      console.error(`[invite] Could not find or create auth user for ${email}`);
      return NextResponse.json({ error: 'Einladung fehlgeschlagen: Auth-User konnte nicht erstellt werden.' }, { status: 500 });
    }
    userId = existing.id;
    console.log(`[invite] Reusing existing auth user ${userId}`);
  }

  // ── Step 2: Generate a magic link for the user (no email sent by Supabase) ──
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase(),
    options: { redirectTo },
  });

  if (!linkData?.properties?.action_link) {
    console.error(`[invite] generateLink failed:`, linkErr);
    return NextResponse.json({ error: `Einladung fehlgeschlagen: ${linkErr?.message ?? 'Link konnte nicht erstellt werden.'}` }, { status: 500 });
  }

  // Fix redirect_to in the link (Supabase often ignores the redirectTo option)
  const rawLink = linkData.properties.action_link;
  const linkUrl = new URL(rawLink);
  linkUrl.searchParams.set('redirect_to', redirectTo);
  const inviteLink = linkUrl.toString();
  console.log(`[invite] Link: ${inviteLink}`);

  // ── Step 3: Create workspace member ──
  const { data, error } = await admin
    .from('workspace_members')
    .upsert(
      {
        id: userId,
        company_id: session.company.id,
        name,
        email: email.toLowerCase(),
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
    console.error('[invite] member upsert', error);
    return NextResponse.json({ error: `Einladung fehlgeschlagen: ${error.message}` }, { status: 500 });
  }

  // ── Step 4: Send invite email via our own SMTP ──
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  let emailSent = false;

  if (!smtpConfigured) {
    console.error(`[invite] SMTP nicht konfiguriert: HOST=${!!process.env.SMTP_HOST}, USER=${!!process.env.SMTP_USER}, PASS=${!!process.env.SMTP_PASS}`);
  } else {
    try {
      console.log(`[invite] Sende E-Mail an ${email} via ${process.env.SMTP_HOST}…`);
      await sendInviteEmail({
        to: email,
        invitedBy: session.member.name,
        companyName: session.company.name,
        inviteLink,
      });
      emailSent = true;
      console.log(`[invite] E-Mail erfolgreich gesendet an ${email}`);
    } catch (mailErr) {
      console.error('[invite] E-Mail-Versand fehlgeschlagen:', mailErr);
    }
  }

  return NextResponse.json({
    member: memberFromDb(data),
    inviteLink: emailSent ? undefined : inviteLink,
  });
}
