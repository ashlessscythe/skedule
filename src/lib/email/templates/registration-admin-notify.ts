export type RegistrationAdminNotifyTemplateInput = {
  tenantName: string;
  userEmail: string;
  userName: string;
};

export function renderRegistrationAdminNotifyEmail(input: RegistrationAdminNotifyTemplateInput) {
  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">New registration pending approval</h1>
      <p style="margin: 0 0 12px 0;">
        A new user requested access to <strong>${escapeHtml(input.tenantName)}</strong>.
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
        <div><strong>Name:</strong> ${escapeHtml(input.userName)}</div>
        <div style="margin-top: 6px;"><strong>Email:</strong> ${escapeHtml(input.userEmail)}</div>
      </div>
      <p style="margin: 16px 0 0 0; font-size: 14px; color: #374151;">
        Review and approve this user in the Staff admin screen.
      </p>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by Skedule on behalf of ${escapeHtml(input.tenantName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Pending access request - ${input.tenantName}`,
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

