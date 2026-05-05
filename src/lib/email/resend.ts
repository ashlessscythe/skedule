import { Resend } from 'resend';

function isEmailEnabled() {
  return (process.env.SEND_EMAIL ?? '').toLowerCase() === 'true';
}

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail(args: SendEmailArgs) {
  if (!isEmailEnabled()) {
    return {
      skipped: true as const,
      reason: 'SEND_EMAIL is not true',
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const from = args.from ?? process.env.EMAIL_FROM_DEFAULT;
  if (!from) throw new Error('Missing EMAIL_FROM_DEFAULT');

  const resend = new Resend(apiKey);
  const res = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  return {
    skipped: false as const,
    id: res.data?.id ?? null,
  };
}

