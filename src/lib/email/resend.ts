import { Resend } from 'resend';

function isEmailEnabled() {
  const v = (process.env.SEND_EMAIL ?? '').trim().toLowerCase();
  if (!v) return true;
  return v !== 'false';
}

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

type ResendErrorLike =
  | { name?: string | null; message?: string | null; statusCode?: number | null }
  | null
  | undefined;

function describeResendError(err: ResendErrorLike): string {
  if (!err) return 'unknown error';
  const parts: string[] = [];
  if (err.name) parts.push(err.name);
  if (typeof err.statusCode === 'number') parts.push(`status=${err.statusCode}`);
  if (err.message) parts.push(err.message);
  return parts.join(' | ') || 'unknown error';
}

function isFromAddressError(err: ResendErrorLike): boolean {
  if (!err) return false;
  const name = (err.name ?? '').toLowerCase();
  const message = (err.message ?? '').toLowerCase();
  if (name.includes('validation')) return true;
  return (
    message.includes('from') ||
    message.includes('domain') ||
    message.includes('verified') ||
    message.includes('verify')
  );
}

export async function sendEmail(args: SendEmailArgs) {
  if (!isEmailEnabled()) {
    return {
      skipped: true as const,
      reason: 'SEND_EMAIL is not true',
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const defaultFrom = process.env.EMAIL_FROM_DEFAULT;
  const requestedFrom = args.from ?? defaultFrom;
  if (!requestedFrom) throw new Error('Missing EMAIL_FROM_DEFAULT');

  const resend = new Resend(apiKey);

  async function attempt(from: string) {
    return resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
  }

  let res = await attempt(requestedFrom);
  let usedFrom = requestedFrom;

  if (res.error && defaultFrom && requestedFrom !== defaultFrom && isFromAddressError(res.error)) {
    console.warn(
      `[email] resend rejected from "${requestedFrom}" (${describeResendError(res.error)}); retrying with EMAIL_FROM_DEFAULT`
    );
    res = await attempt(defaultFrom);
    usedFrom = defaultFrom;
  }

  if (res.error) {
    throw new Error(`Resend send failed (from="${usedFrom}"): ${describeResendError(res.error)}`);
  }

  return {
    skipped: false as const,
    id: res.data?.id ?? null,
  };
}

