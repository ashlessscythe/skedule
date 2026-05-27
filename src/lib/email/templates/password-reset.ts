import {
  escapeHtml,
  renderEmailButton,
  renderEmailLayout,
  renderEmailMuted,
  renderEmailParagraph,
} from './layout';

export type PasswordResetTemplateInput = {
  userName: string;
  resetUrl: string;
  appName?: string;
};

export function renderPasswordResetEmail(input: PasswordResetTemplateInput) {
  const appName = input.appName?.trim() ? input.appName.trim() : 'Skedule';

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.userName)},`),
    renderEmailParagraph(
      'We received a request to reset your password. Use the button below to choose a new one. This link expires for your security.'
    ),
    renderEmailButton(input.resetUrl, 'Reset password', 'brand'),
    renderEmailMuted(
      'If you didn&rsquo;t request this, you can safely ignore this email. Your password will not change.'
    ),
  ].join('');

  const html = renderEmailLayout({
    title: 'Reset your password',
    badge: 'Security',
    bodyHtml,
    footerHtml: `This message was sent by ${escapeHtml(appName)}.`,
    accent: 'brand',
    appName,
    preheader: 'Reset your password using the secure link inside.',
  });

  return {
    subject: `Reset your password`,
    html,
  };
}
