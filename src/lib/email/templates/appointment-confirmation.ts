import {
  escapeHtml,
  renderEmailButton,
  renderEmailCallout,
  renderEmailCheckinBlock,
  type EmailCheckinLinks,
  renderEmailDetailCard,
  renderEmailLayout,
  renderEmailParagraph,
} from './layout';

export type AppointmentConfirmationTemplateInput = {
  tenantName: string;
  clientName: string;
  startTimeLocal: string;
  locationName: string;
  manageUrl?: string;
  checkin?: EmailCheckinLinks;
  /** When > 0, show a short note about additional occurrences in the same series. */
  seriesExtraCount?: number;
};

export function renderAppointmentConfirmationEmail(
  input: AppointmentConfirmationTemplateInput
) {
  const tenant = escapeHtml(input.tenantName);

  const bodyParts = [
    renderEmailParagraph(`Hi ${escapeHtml(input.clientName)},`),
    renderEmailParagraph(
      `Your appointment with <strong>${tenant}</strong> is confirmed. Here are the details:`
    ),
    renderEmailDetailCard([
      { label: 'When', value: escapeHtml(input.startTimeLocal) },
      { label: 'Where', value: escapeHtml(input.locationName) },
    ]),
  ];

  if (input.seriesExtraCount != null && input.seriesExtraCount > 0) {
    bodyParts.push(
      renderEmailCallout(
        `This booking is part of a recurring series — <strong>${input.seriesExtraCount}</strong> more occurrence(s) are scheduled at the same time of day.`,
        'info'
      )
    );
  }

  if (input.checkin) {
    bodyParts.push(renderEmailCheckinBlock(input.checkin));
  }

  if (input.manageUrl) {
    bodyParts.push(renderEmailButton(input.manageUrl, 'View appointment details', 'brand'));
  }

  const html = renderEmailLayout({
    title: 'Appointment confirmed',
    badge: 'Confirmed',
    bodyHtml: bodyParts.join(''),
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'success',
    preheader: `Your appointment with ${input.tenantName} is confirmed.`,
  });

  return {
    subject: `Appointment confirmed - ${input.tenantName}`,
    html,
  };
}
