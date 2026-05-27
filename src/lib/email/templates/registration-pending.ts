import {
  escapeHtml,
  renderEmailCallout,
  renderEmailLayout,
  renderEmailMuted,
  renderEmailParagraph,
} from './layout';

export type RegistrationPendingTemplateInput = {
  tenantName: string;
  userName: string;
};

export function renderRegistrationPendingEmail(input: RegistrationPendingTemplateInput) {
  const tenant = escapeHtml(input.tenantName);

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.userName)},`),
    renderEmailParagraph(
      `Thanks for registering for <strong>${tenant}</strong>. Your access request is pending approval by an administrator.`
    ),
    renderEmailCallout(
      '<strong>What happens next?</strong> An administrator will review your request. We&rsquo;ll email you as soon as your account is approved.',
      'warning'
    ),
    renderEmailMuted('No action is required on your part right now.'),
  ].join('');

  const html = renderEmailLayout({
    title: 'Registration received',
    badge: 'Pending approval',
    bodyHtml,
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'warning',
    preheader: `Your registration for ${input.tenantName} is awaiting approval.`,
  });

  return {
    subject: `Registration received - ${input.tenantName}`,
    html,
  };
}
