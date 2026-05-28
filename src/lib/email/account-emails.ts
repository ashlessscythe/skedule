import { sendEmail } from '@/lib/email/resend';
import { renderEmailChangeVerificationEmail } from '@/lib/email/templates/email-change-verification';
import { renderEmailChangedByAdminEmail } from '@/lib/email/templates/email-changed-by-admin';

export async function sendEmailChangeVerificationCode(options: {
  toEmail: string;
  userName: string;
  code: string;
  expiresMinutes: number;
}) {
  const { subject, html } = renderEmailChangeVerificationEmail({
    userName: options.userName,
    code: options.code,
    expiresMinutes: options.expiresMinutes,
  });

  const result = await sendEmail({ to: options.toEmail, subject, html });
  if (result.skipped) console.info('[email] email change verification skipped:', result.reason);
}

export async function sendAdminEmailChangedNotice(options: {
  toEmail: string;
  userName: string;
  newEmail: string;
}) {
  const { subject, html } = renderEmailChangedByAdminEmail({
    userName: options.userName,
    newEmail: options.newEmail,
  });

  const result = await sendEmail({ to: options.toEmail, subject, html });
  if (result.skipped) console.info('[email] admin email change notice skipped:', result.reason);
}
