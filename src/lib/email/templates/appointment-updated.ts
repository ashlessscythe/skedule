export type AppointmentUpdatedTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
};

export function renderAppointmentUpdatedEmail(input: AppointmentUpdatedTemplateInput) {
  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">Appointment updated</h1>
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(input.clientName)},</p>
      <p style="margin: 0 0 12px 0;">
        Your appointment with <strong>${escapeHtml(input.tenantName)}</strong> has new details:
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
        <div><strong>When:</strong> ${escapeHtml(input.startTimeLocal)}</div>
        <div style="margin-top: 6px;"><strong>Where:</strong> ${escapeHtml(input.locationName)}</div>
      </div>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by Skedule on behalf of ${escapeHtml(input.tenantName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Appointment updated - ${input.tenantName}`,
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
