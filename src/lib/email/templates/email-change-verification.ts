import {
  escapeHtml,
  renderEmailLayout,
  renderEmailMuted,
  renderEmailParagraph,
} from './layout';

export type EmailChangeVerificationTemplateInput = {
  userName: string;
  code: string;
  expiresMinutes: number;
  appName?: string;
};

export function renderEmailChangeVerificationEmail(input: EmailChangeVerificationTemplateInput) {
  const appName = input.appName?.trim() ? input.appName.trim() : 'Skedule';
  const code = escapeHtml(input.code);

  const bodyHtml = [
    renderEmailParagraph(`Hi ${escapeHtml(input.userName)},`),
    renderEmailParagraph(
      'Use the verification code below to confirm your new email address for your Skedule account.'
    ),
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:16px 24px;border-radius:12px;background:#f1f5f9;text-align:center;">
          <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:0.35em;color:#0f172a;">${code}</span>
        </td>
      </tr>
    </table>`,
    renderEmailMuted(
      `This code expires in ${input.expiresMinutes} minutes. If you didn&rsquo;t request this change, you can ignore this email.`
    ),
  ].join('');

  const html = renderEmailLayout({
    title: 'Confirm your new email',
    badge: 'Account',
    bodyHtml,
    footerHtml: `This message was sent by ${escapeHtml(appName)}.`,
    accent: 'brand',
    appName,
    preheader: `Your verification code is ${input.code}`,
  });

  return {
    subject: `${input.code} — confirm your new email`,
    html,
  };
}
