import {
  escapeHtml,
  renderEmailCallout,
  renderEmailCheckinBlock,
  type EmailCheckinLinks,
  renderEmailDetailCard,
  renderEmailLayout,
  renderEmailParagraph,
} from './layout';

export type AppointmentUpdatedTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
  checkin?: EmailCheckinLinks;
};

export function renderAppointmentUpdatedEmail(input: AppointmentUpdatedTemplateInput) {
  const tenant = escapeHtml(input.tenantName);

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.clientName)},`),
    renderEmailParagraph(
      `Your appointment with <strong>${tenant}</strong> has been updated. Please review the new details below.`
    ),
    renderEmailCallout(
      '<strong>Schedule change.</strong> The time or location below may differ from your previous confirmation.',
      'warning'
    ),
    renderEmailDetailCard([
      { label: 'When', value: escapeHtml(input.startTimeLocal) },
      { label: 'Where', value: escapeHtml(input.locationName) },
    ]),
    ...(input.checkin ? [renderEmailCheckinBlock(input.checkin)] : []),
  ].join('');

  const html = renderEmailLayout({
    title: 'Appointment updated',
    badge: 'Updated',
    bodyHtml,
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'warning',
    preheader: `Your appointment with ${input.tenantName} has been updated.`,
  });

  return {
    subject: `Appointment updated - ${input.tenantName}`,
    html,
  };
}
