import {
  escapeHtml,
  renderEmailCallout,
  renderEmailDetailCard,
  renderEmailLayout,
  renderEmailParagraph,
} from './layout';

export type AppointmentCancelledTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
};

export function renderAppointmentCancelledEmail(input: AppointmentCancelledTemplateInput) {
  const tenant = escapeHtml(input.tenantName);

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.clientName)},`),
    renderEmailParagraph(
      `The following appointment with <strong>${tenant}</strong> has been cancelled.`
    ),
    renderEmailDetailCard([
      { label: 'Was scheduled', value: escapeHtml(input.startTimeLocal) },
      { label: 'Where', value: escapeHtml(input.locationName) },
    ]),
    renderEmailCallout(
      'If you believe this was a mistake or would like to rebook, please contact the office directly.',
      'info'
    ),
  ].join('');

  const html = renderEmailLayout({
    title: 'Appointment cancelled',
    badge: 'Cancelled',
    bodyHtml,
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'danger',
    preheader: `Your appointment with ${input.tenantName} has been cancelled.`,
  });

  return {
    subject: `Appointment cancelled - ${input.tenantName}`,
    html,
  };
}
