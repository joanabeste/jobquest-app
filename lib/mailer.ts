import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const passRaw = process.env.SMTP_PASS_B64
    ? Buffer.from(process.env.SMTP_PASS_B64, 'base64').toString('utf8')
    : process.env.SMTP_PASS;

  if (!host || !user || !passRaw) {
    throw new Error(
      `SMTP nicht konfiguriert. Setze SMTP_HOST, SMTP_USER und SMTP_PASS_B64 in .env.local.`,
    );
  }
  const pass = passRaw;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function sendInviteEmail({
  to,
  invitedBy,
  companyName,
  inviteLink,
}: {
  to: string;
  invitedBy: string;
  companyName: string;
  inviteLink: string;
}) {
  const from = process.env.SMTP_FROM ?? `${process.env.SMTP_USER}`;
  await createTransporter().sendMail({
    from,
    to,
    subject: `Einladung zu ${companyName}`,
    html: `
      <p>Hallo,</p>
      <p><strong>${invitedBy}</strong> hat dich eingeladen, dem Team von <strong>${companyName}</strong> auf JobQuest beizutreten.</p>
      <p>
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Einladung annehmen
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">Dieser Link ist 24 Stunden gültig. Falls du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
    `,
  });
}
