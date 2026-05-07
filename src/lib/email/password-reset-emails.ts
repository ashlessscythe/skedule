import { sendEmail } from '@/lib/email/resend';
import { renderPasswordResetEmail } from '@/lib/email/templates/password-reset';

export async function sendPasswordResetEmail(options: {
  userEmail: string;
  userName: string;
  resetUrl: string;
}) {
  const { subject, html } = renderPasswordResetEmail({
    userName: options.userName,
    resetUrl: options.resetUrl,
  });

  const result = await sendEmail({
    to: options.userEmail,
    subject,
    html,
  });
  if (result.skipped) console.info('[email] password reset skipped:', result.reason);
}

