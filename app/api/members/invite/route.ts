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
    console.log(`[invite] generateLink failed: ${msg} — checking for orphaned auth user`);

    // User exists in auth but not in workspace_members (e.g. previously deleted member)
    // → Delete the orphaned auth user and retry with a fresh invite
    if (msg.includes('already') || msg.includes('exist')) {
      // Query auth.users directly via SQL to avoid listUsers pagination issues
      const { data: authRow } = await admin.rpc('get_auth_user_by_email', { lookup_email: email.toLowerCase() }).single();

      // Fallback: try listUsers with high perPage if RPC doesn't exist
      let orphanId: string | null = (authRow as { id?: string } | null)?.id ?? null;
      if (!orphanId) {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const found = listData?.users?.find((u) => u.email === email.toLowerCase());
        orphanId = found?.id ?? null;
      }

      if (orphanId) {
        console.log(`[invite] Deleting orphaned auth user ${orphanId}`);
        const { error: deleteErr } = await admin.auth.admin.deleteUser(orphanId);
        if (deleteErr) {
          console.error(`[invite] Failed to delete orphaned auth user:`, deleteErr);
        } else {
          const { data: retryData, error: retryErr } = await admin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: { redirectTo: `${siteUrl}/accept-invite` },
          });
          if (retryData?.user) {
            linkData = retryData as unknown as LinkResult;
            console.log(`[invite] Retry succeeded — fresh invite created`);
          } else {
            console.error(`[invite] Retry generateLink failed:`, retryErr);
          }
        }
      } else {
        console.error(`[invite] Could not find orphaned auth user for ${email}`);
      }
    }

    if (!linkData) {
      console.error('[invite] generateLink ultimately failed:', linkError);
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
