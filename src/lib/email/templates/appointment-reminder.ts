import {
  escapeHtml,
  renderEmailCallout,
  renderEmailCheckinBlock,
  type EmailCheckinLinks,
  renderEmailDetailCard,
  renderEmailLayout,
  renderEmailParagraph,
} from './layout';

export type AppointmentReminderTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
  checkin?: EmailCheckinLinks;
};

export function renderAppointmentReminderEmail(input: AppointmentReminderTemplateInput) {
  const tenant = escapeHtml(input.tenantName);

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.clientName)},`),
    renderEmailParagraph(`This is a friendly reminder from <strong>${tenant}</strong>.`),
    renderEmailDetailCard([
      { label: 'When', value: escapeHtml(input.startTimeLocal) },
      { label: 'Where', value: escapeHtml(input.locationName) },
    ]),
    renderEmailCallout(
      'Please arrive a few minutes early. Contact the office if you need to reschedule.',
      'info'
    ),
    ...(input.checkin ? [renderEmailCheckinBlock(input.checkin)] : []),
  ].join('');

  const html = renderEmailLayout({
    title: 'Reminder: upcoming appointment',
    badge: 'Reminder',
    bodyHtml,
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'info',
    preheader: `Reminder: you have an upcoming appointment with ${input.tenantName}.`,
  });

  return {
    subject: `Reminder: appointment at ${input.tenantName}`,
    html,
  };
}
