export type RegistrationApprovedTemplateInput = {
  tenantName: string;
  userName: string;
  loginUrl?: string;
};

export function renderRegistrationApprovedEmail(input: RegistrationApprovedTemplateInput) {
  const login =
    input.loginUrl != null && input.loginUrl.trim()
      ? `<p style="margin:16px 0 0 0"><a href="${input.loginUrl}">Sign in</a></p>`
      : '';

  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">You’re approved</h1>
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(input.userName)},</p>
      <p style="margin: 0 0 12px 0;">
        Your account for <strong>${escapeHtml(input.tenantName)}</strong> has been approved. You can now sign in.
      </p>
      ${login}
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by Skedule on behalf of ${escapeHtml(input.tenantName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Access approved - ${input.tenantName}`,
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

