import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/api-auth';
import { applyVars } from '@/lib/funnel-variables';
import type { EmailConfig } from '@/lib/funnel-types';

type Kind = 'confirmation' | 'notification';

const SAMPLE_VARS: Record<string, string> = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max.mustermann@example.com',
  phone: '+49 170 1234567',
  companyName: 'Beispiel GmbH',
  karriereseiteUrl: 'https://example.com/karriere',
};

function err(status: number, code: string, message: string, detail?: string) {
  return NextResponse.json({ ok: false, code, message, detail }, { status });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return err(401, 'UNAUTHORIZED', 'Du musst angemeldet sein, um Test-E-Mails zu senden.');
  }

  let body: { kind?: Kind; config?: EmailConfig; to?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, 'BAD_JSON', 'Anfrage konnte nicht gelesen werden (ungültiges JSON).');
  }

  const { kind, config } = body;
  if (!config) return err(400, 'MISSING_CONFIG', 'E-Mail-Konfiguration fehlt.');
  if (kind !== 'confirmation' && kind !== 'notification') {
    return err(400, 'BAD_KIND', 'Unbekannter E-Mail-Typ. Erwartet: "confirmation" oder "notification".');
  }

  // Validate environment
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (missing.length) {
    return err(500, 'SMTP_NOT_CONFIGURED',
      `SMTP ist nicht konfiguriert. Fehlende Umgebungsvariablen: ${missing.join(', ')}.`);
  }

  // Determine recipient + subject + bodySource per kind
  let to: string;
  let subjectSrc: string;
  let bodySrc: string;
  let attachments: { filename: string; path: string }[] = [];

  const fallbackTo = body.to || session.member.email;

  if (kind === 'confirmation') {
    if (!config.confirmationEnabled) {
      return err(400, 'CONFIRMATION_DISABLED',
        'Die Bestätigungs-E-Mail ist deaktiviert. Aktiviere sie zuerst, um sie zu testen.');
    }
    if (!config.confirmationSubject?.trim()) {
      return err(400, 'MISSING_SUBJECT', 'Der Betreff der Bestätigungs-E-Mail ist leer.');
    }
    if (!config.confirmationBody?.trim()) {
      return err(400, 'MISSING_BODY', 'Der Text der Bestätigungs-E-Mail ist leer.');
    }
    if (!fallbackTo) {
      return err(400, 'MISSING_RECIPIENT',
        'Keine Test-Empfängeradresse gefunden. Hinterlege eine E-Mail in deinem Account.');
    }
    to = fallbackTo;
    subjectSrc = config.confirmationSubject;
    bodySrc = config.confirmationBody;
    if (config.confirmationAttachment?.url) {
      attachments = [{
        filename: config.confirmationAttachment.filename || 'Anhang',
        path: config.confirmationAttachment.url,
      }];
    }
  } else {
    if (!config.notificationEnabled) {
      return err(400, 'NOTIFICATION_DISABLED',
        'Die Benachrichtigungs-E-Mail ist deaktiviert. Aktiviere sie zuerst, um sie zu testen.');
    }
    if (!config.notificationRecipient?.trim()) {
      return err(400, 'MISSING_RECIPIENT',
        'Es ist kein interner Empfänger hinterlegt. Trage eine E-Mail-Adresse ein.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.notificationRecipient.trim())) {
      return err(400, 'INVALID_RECIPIENT',
        `Die Empfängeradresse "${config.notificationRecipient}" ist keine gültige E-Mail-Adresse.`);
    }
    if (!config.notificationSubject?.trim()) {
      return err(400, 'MISSING_SUBJECT', 'Der Betreff der Benachrichtigungs-E-Mail ist leer.');
    }
    if (!config.notificationBody?.trim()) {
      return err(400, 'MISSING_BODY', 'Der Text der Benachrichtigungs-E-Mail ist leer.');
    }
    to = config.notificationRecipient.trim();
    subjectSrc = config.notificationSubject;
    bodySrc = config.notificationBody;
  }

  // Build transporter
  let transporter: nodemailer.Transporter;
  try {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      connectionTimeout: 8_000,
      greetingTimeout: 6_000,
      socketTimeout: 12_000,
    });
  } catch (e) {
    return err(500, 'TRANSPORT_INIT_FAILED',
      'SMTP-Transport konnte nicht erstellt werden.', e instanceof Error ? e.message : String(e));
  }

  // Verify connection up front for clearer errors
  try {
    await transporter.verify();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let code = 'SMTP_VERIFY_FAILED';
    let friendly = 'SMTP-Verbindung fehlgeschlagen.';
    if (/EAUTH|535|authentication/i.test(msg)) {
      code = 'SMTP_AUTH_FAILED';
      friendly = 'SMTP-Authentifizierung fehlgeschlagen. Prüfe SMTP_USER und SMTP_PASS.';
    } else if (/ENOTFOUND|EAI_AGAIN/i.test(msg)) {
      code = 'SMTP_HOST_UNREACHABLE';
      friendly = `SMTP-Host "${host}" ist nicht erreichbar (DNS/Netzwerk).`;
    } else if (/ETIMEDOUT|ECONN/i.test(msg)) {
      code = 'SMTP_TIMEOUT';
      friendly = 'Zeitüberschreitung beim Verbindungsaufbau zum SMTP-Server. Prüfe Host/Port/Firewall.';
    } else if (/self.signed|certificate/i.test(msg)) {
      code = 'SMTP_TLS_ERROR';
      friendly = 'TLS-/Zertifikatsproblem beim SMTP-Server.';
    }
    return err(502, code, friendly, msg);
  }

  // Render + send
  const from = process.env.SMTP_FROM ?? user!;
  const subject = `[TEST] ${applyVars(subjectSrc, SAMPLE_VARS)}`;
  const html = applyVars(bodySrc, SAMPLE_VARS);

  try {
    const info = await transporter.sendMail({ from, to, subject, html, attachments });
    return NextResponse.json({
      ok: true,
      message: `Test-E-Mail wurde an ${to} gesendet.`,
      messageId: info.messageId,
      to,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let code = 'SEND_FAILED';
    let friendly = 'E-Mail konnte nicht gesendet werden.';
    if (/550|recipient|no such user/i.test(msg)) {
      code = 'RECIPIENT_REJECTED';
      friendly = `Empfänger "${to}" wurde vom Server abgelehnt.`;
    } else if (/553|sender|from/i.test(msg)) {
      code = 'SENDER_REJECTED';
      friendly = `Absender "${from}" wurde vom Server abgelehnt. Prüfe SMTP_FROM.`;
    } else if (/attachment|ENOENT|fetch/i.test(msg)) {
      code = 'ATTACHMENT_FAILED';
      friendly = 'Anhang konnte nicht geladen werden. Prüfe die Datei-URL.';
    }
    return err(502, code, friendly, msg);
  }
}
