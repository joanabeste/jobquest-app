import nodemailer from 'nodemailer';
import type { EmailConfig } from './funnel-types';
import { applyVars } from './funnel-variables';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP nicht konfiguriert. Setze SMTP_HOST, SMTP_USER und SMTP_PASS in .env.local.',
    );
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
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


// ─── Lead-E-Mails senden (Bestätigung + Benachrichtigung) ────────────────────
export async function sendLeadEmails({
  emailConfig,
  vars,
}: {
  emailConfig: EmailConfig;
  vars: Record<string, string>; // firstName, lastName, email, phone, companyName
}) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';

  // Bestätigungs-E-Mail → an die Person, die das Formular abgesendet hat
  if (emailConfig.confirmationEnabled && vars.email) {
    const attachments = emailConfig.confirmationAttachment?.url
      ? [{ filename: emailConfig.confirmationAttachment.filename || 'Anhang', path: emailConfig.confirmationAttachment.url }]
      : [];
    const body = applyVars(emailConfig.confirmationBody, vars);
    await transporter.sendMail({
      from,
      to: vars.email,
      subject: applyVars(emailConfig.confirmationSubject, vars),
      html: body, // visual mode produces HTML; raw HTML mode is also HTML
      attachments,
    });
  }

  // Benachrichtigungs-E-Mail → an interne Empfänger
  if (emailConfig.notificationEnabled && emailConfig.notificationRecipient) {
    const body = applyVars(emailConfig.notificationBody, vars);
    await transporter.sendMail({
      from,
      to: emailConfig.notificationRecipient,
      subject: applyVars(emailConfig.notificationSubject, vars),
      html: body, // visual mode produces HTML; raw HTML mode is also HTML
    });
  }
}
