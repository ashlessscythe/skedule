import {
  escapeHtml,
  renderEmailButton,
  renderEmailCallout,
  renderEmailLayout,
  renderEmailParagraph,
} from './layout';

export type RegistrationApprovedTemplateInput = {
  tenantName: string;
  userName: string;
  loginUrl?: string;
};

export function renderRegistrationApprovedEmail(input: RegistrationApprovedTemplateInput) {
  const tenant = escapeHtml(input.tenantName);
  const loginUrl = input.loginUrl?.trim() ?? '';

  const bodyParts = [
    renderEmailParagraph(`Hi ${escapeHtml(input.userName)},`),
    renderEmailParagraph(
      `Your account for <strong>${tenant}</strong> has been approved. You can now sign in and start using the platform.`
    ),
    renderEmailCallout(
      '<strong>You&rsquo;re all set.</strong> Your administrator has granted access. Sign in with the email address you registered with.',
      'success'
    ),
  ];

  if (loginUrl) {
    bodyParts.push(renderEmailButton(loginUrl, 'Sign in', 'success'));
  }

  const html = renderEmailLayout({
    title: 'You\u2019re approved',
    badge: 'Access granted',
    bodyHtml: bodyParts.join(''),
    footerHtml: `This message was sent by Skedule on behalf of ${tenant}.`,
    accent: 'success',
    preheader: `Your access to ${input.tenantName} has been approved.`,
  });

  return {
    subject: `Access approved - ${input.tenantName}`,
    html,
  };
}
