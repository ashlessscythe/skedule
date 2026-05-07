export type PasswordResetTemplateInput = {
  userName: string;
  resetUrl: string;
  appName?: string;
};

export function renderPasswordResetEmail(input: PasswordResetTemplateInput) {
  const appName = input.appName?.trim() ? input.appName.trim() : 'Skedule';
  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">Reset your password</h1>
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(input.userName)},</p>
      <p style="margin: 0 0 12px 0;">
        We received a request to reset your password. Click the link below to choose a new one:
      </p>
      <p style="margin:16px 0 0 0"><a href="${input.resetUrl}">Reset password</a></p>
      <p style="margin: 16px 0 0 0; font-size: 14px; color: #374151;">
        If you didn’t request this, you can safely ignore this email.
      </p>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by ${escapeHtml(appName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Reset your password`,
    html,
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

