import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendEmail(payload: {
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}): Promise<void> {
  const t = getTransporter();
  if (!t || !process.env.NOTIFY_EMAIL_TO) return;

  const time = new Date(payload.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = new Date(payload.timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const verb = payload.action === 'in' ? 'Clocked In' : 'Clocked Out';

  await t.sendMail({
    from: process.env.SMTP_FROM ?? 'Clocking App <noreply@example.com>',
    to: process.env.NOTIFY_EMAIL_TO,
    subject: `${payload.employeeName} ${verb} — ${time}`,
    text: `${payload.employeeName} ${verb.toLowerCase()} at ${time} on ${date}.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:${payload.action === 'in' ? '#16a34a' : '#ca8a04'}">
          ${verb}
        </h2>
        <p><strong>Employee:</strong> ${payload.employeeName}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Date:</strong> ${date}</p>
      </div>
    `,
  });
}
