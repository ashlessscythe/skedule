export type EmailAccent = 'brand' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';

const ACCENT: Record<
  EmailAccent,
  { bar: string; badgeBg: string; badgeText: string; buttonBg: string; buttonText: string }
> = {
  brand: {
    bar: '#1e40af',
    badgeBg: '#eff6ff',
    badgeText: '#1e40af',
    buttonBg: '#1e40af',
    buttonText: '#ffffff',
  },
  success: {
    bar: '#047857',
    badgeBg: '#ecfdf5',
    badgeText: '#047857',
    buttonBg: '#047857',
    buttonText: '#ffffff',
  },
  warning: {
    bar: '#b45309',
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    buttonBg: '#b45309',
    buttonText: '#ffffff',
  },
  info: {
    bar: '#0369a1',
    badgeBg: '#f0f9ff',
    badgeText: '#0369a1',
    buttonBg: '#0369a1',
    buttonText: '#ffffff',
  },
  neutral: {
    bar: '#475569',
    badgeBg: '#f8fafc',
    badgeText: '#475569',
    buttonBg: '#334155',
    buttonText: '#ffffff',
  },
  danger: {
    bar: '#b91c1c',
    badgeBg: '#fef2f2',
    badgeText: '#b91c1c',
    buttonBg: '#b91c1c',
    buttonText: '#ffffff',
  },
};

export type EmailLayoutInput = {
  /** Visible headline inside the card */
  title: string;
  /** Short label shown as a pill above the title */
  badge?: string;
  /** Main HTML content (already escaped where needed) */
  bodyHtml: string;
  /** Footer line, e.g. "Sent by Skedule on behalf of …" */
  footerHtml: string;
  accent?: EmailAccent;
  /** Shown in the letterhead; defaults to Skedule */
  appName?: string;
  /** Hidden preview text for inbox clients */
  preheader?: string;
};

export function renderEmailLayout(input: EmailLayoutInput): string {
  const accent = ACCENT[input.accent ?? 'brand'];
  const appName = input.appName?.trim() ? escapeHtml(input.appName.trim()) : 'Skedule';
  const badge = input.badge?.trim()
    ? `<tr>
        <td style="padding:0 28px 0 28px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;background:${accent.badgeBg};color:${accent.badgeText};">
            ${escapeHtml(input.badge.trim())}
          </span>
        </td>
      </tr>`
    : '';
  const preheader = input.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader.trim())}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:4px;background-color:${accent.bar};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${appName}</div>
            </td>
          </tr>
          ${badge}
          <tr>
            <td style="padding:${input.badge?.trim() ? '12px' : '8px'} 28px 0 28px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.3;color:#0f172a;">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px 28px;font-size:15px;line-height:1.6;color:#334155;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px 28px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">${input.footerHtml}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailButton(
  href: string,
  label: string,
  accent: EmailAccent = 'brand'
): string {
  const colors = ACCENT[accent];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0 0;">
  <tr>
    <td align="left" style="border-radius:8px;background-color:${colors.buttonBg};">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${colors.buttonText};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export type EmailDetailRow = { label: string; value: string };

/** Bordered detail card for dates, locations, user info, etc. */
export function renderEmailDetailCard(rows: EmailDetailRow[]): string {
  const rowsHtml = rows
    .map(
      (row, i) => `<tr>
        <td style="padding:${i === 0 ? '0' : '10px'} 0 0 0;font-size:14px;line-height:1.5;color:#334155;">
          <span style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:2px;">${escapeHtml(row.label)}</span>
          <span style="font-size:15px;font-weight:500;color:#0f172a;">${row.value}</span>
        </td>
      </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;border-left:4px solid #1e40af;">
  <tr>
    <td style="padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rowsHtml}
      </table>
    </td>
  </tr>
</table>`;
}

export type EmailCalloutVariant = 'info' | 'warning' | 'success';

const CALLOUT: Record<EmailCalloutVariant, { bg: string; border: string; text: string }> = {
  info: { bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
};

export function renderEmailCallout(html: string, variant: EmailCalloutVariant = 'info'): string {
  const c = CALLOUT[variant];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;">
  <tr>
    <td style="padding:12px 14px;background-color:${c.bg};border:1px solid ${c.border};border-radius:8px;font-size:14px;line-height:1.5;color:${c.text};">
      ${html}
    </td>
  </tr>
</table>`;
}

export function renderEmailParagraph(text: string): string {
  return `<p style="margin:0 0 12px 0;">${text}</p>`;
}

export function renderEmailMuted(text: string): string {
  return `<p style="margin:16px 0 0 0;font-size:14px;line-height:1.5;color:#64748b;">${text}</p>`;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
