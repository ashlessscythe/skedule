import {
  escapeHtml,
  renderEmailDetailCard,
  renderEmailLayout,
  renderEmailMuted,
  renderEmailParagraph,
} from './layout';

export type RegistrationAdminNotifyTemplateInput = {
  tenantName: string;
  userEmail: string;
  userName: string;
};

export function renderRegistrationAdminNotifyEmail(input: RegistrationAdminNotifyTemplateInput) {
  const tenant = escapeHtml(input.tenantName);

  const bodyHtml = [
    renderEmailParagraph(
      `A new user requested access to <strong>${tenant}</strong>. Review their details below.`
    ),
    renderEmailDetailCard([
      { label: 'Name', value: escapeHtml(input.userName) },
      { label: 'Email', value: escapeHtml(input.userEmail) },
    ]),
    renderEmailMuted('Approve or deny this request from the <strong>Staff</strong> admin screen.'),
  ].join('');

  const html = renderEmailLayout({
    title: 'New registration pending approval',
    badge: 'Action required',
    bodyHtml,
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'info',
    preheader: `New access request for ${input.tenantName} from ${input.userEmail}.`,
  });

  return {
    subject: `Pending access request - ${input.tenantName}`,
    html,
  };
}
