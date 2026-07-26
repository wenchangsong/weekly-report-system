import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  } else {
    console.warn('SMTP not configured, email reminders will be logged only');
  }

  return transporter;
}

export async function sendEmail(options: { to: string; subject: string; text: string }): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email Mock] To: ${options.to}, Subject: ${options.subject}`);
    console.log(`[Email Mock] Body: ${options.text}`);
    return;
  }

  const from = process.env.REMINDER_FROM_EMAIL || 'noreply@weeklyreport.app';
  await t.sendMail({ from, to: options.to, subject: options.subject, text: options.text });
}
