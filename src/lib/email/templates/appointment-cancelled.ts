export type AppointmentCancelledTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
};

export function renderAppointmentCancelledEmail(input: AppointmentCancelledTemplateInput) {
  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px 0;">Appointment cancelled</h1>
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(input.clientName)},</p>
      <p style="margin: 0 0 12px 0;">
        The following appointment with <strong>${escapeHtml(input.tenantName)}</strong> has been cancelled:
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
        <div><strong>Was scheduled:</strong> ${escapeHtml(input.startTimeLocal)}</div>
        <div style="margin-top: 6px;"><strong>Where:</strong> ${escapeHtml(input.locationName)}</div>
      </div>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280;">
        This message was sent by Skedule on behalf of ${escapeHtml(input.tenantName)}.
      </p>
    </div>
  </body>
</html>`;

  return {
    subject: `Appointment cancelled - ${input.tenantName}`,
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
