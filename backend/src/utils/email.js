const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// Required env vars: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
// Optional: SMTP_FROM (defaults to SMTP_USER)
async function sendEmail({ to, subject, text, html }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP not configured — skipping email to', to);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, text, html });
  console.log('[EMAIL] Sent to', to, '— subject:', subject);
}

module.exports = { sendEmail };
