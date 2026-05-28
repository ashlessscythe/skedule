import {
  escapeHtml,
  renderEmailLayout,
  renderEmailMuted,
  renderEmailParagraph,
} from './layout';

export type EmailChangedByAdminTemplateInput = {
  userName: string;
  newEmail: string;
  appName?: string;
};

export function renderEmailChangedByAdminEmail(input: EmailChangedByAdminTemplateInput) {
  const appName = input.appName?.trim() ? input.appName.trim() : 'Skedule';

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.userName)},`),
    renderEmailParagraph(
      `An administrator updated the login email on your ${escapeHtml(appName)} account to <strong>${escapeHtml(input.newEmail)}</strong>.`
    ),
    renderEmailParagraph(
      'Use this address the next time you sign in. If you did not expect this change, contact your organization administrator right away.'
    ),
    renderEmailMuted('For your security, existing sessions were signed out.'),
  ].join('');

  const html = renderEmailLayout({
    title: 'Your login email was updated',
    badge: 'Account',
    bodyHtml,
    footerHtml: `This message was sent by ${escapeHtml(appName)}.`,
    accent: 'info',
    appName,
    preheader: 'Your Skedule login email was changed by an administrator.',
  });

  return {
    subject: 'Your login email was updated',
    html,
  };
}
