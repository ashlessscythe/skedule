export type RegistrationPendingTemplateInput = {
  tenantName: string;
  userName: string;
};

export function renderRegistrationPendingEmail(input: RegistrationPendingTemplateInput) {
  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">Registration received</h1>
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(input.userName)},</p>
      <p style="margin: 0 0 12px 0;">
        Thanks for registering for <strong>${escapeHtml(input.tenantName)}</strong>.
        Your access request is pending approval by an administrator.
      </p>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
        We’ll email you as soon as your account is approved.
      </p>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by Skedule on behalf of ${escapeHtml(input.tenantName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Registration received - ${input.tenantName}`,
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

