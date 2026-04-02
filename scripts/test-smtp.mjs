/**
 * SMTP-Test: node scripts/test-smtp.mjs <empfaenger@example.com>
 * Liest SMTP-Credentials aus .env.local
 */
import { readFileSync } from 'fs';
import { createTransport } from 'nodemailer';

// .env.local manuell parsen (kein dotenv nötig)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      const key = l.slice(0, i).trim();
      let val = l.slice(i + 1).trim();
      // Strip surrounding quotes (single or double)
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return [key, val];
    }),
);

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/test-smtp.mjs <empfaenger@example.com>');
  process.exit(1);
}

console.log('SMTP Config:');
console.log('  Host:', env.SMTP_HOST);
console.log('  Port:', env.SMTP_PORT);
console.log('  Secure:', env.SMTP_SECURE);
console.log('  User:', env.SMTP_USER);
console.log('  From:', env.SMTP_FROM);
console.log('');

const transporter = createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT ?? 587),
  secure: env.SMTP_SECURE === 'true',
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

console.log('Verbindung wird geprüft...');
try {
  await transporter.verify();
  console.log('✓ SMTP-Verbindung erfolgreich');
} catch (err) {
  console.error('✗ Verbindung fehlgeschlagen:', err.message);
  process.exit(1);
}

console.log(`\nSende Testmail an ${to}...`);
try {
  const info = await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to,
    subject: 'JobQuest SMTP-Test',
    text: 'Diese E-Mail bestätigt, dass dein SMTP-Server korrekt konfiguriert ist.',
  });
  console.log('✓ Gesendet! Message-ID:', info.messageId);
} catch (err) {
  console.error('✗ Senden fehlgeschlagen:', err.message);
  process.exit(1);
}
