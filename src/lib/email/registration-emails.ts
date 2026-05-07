import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/resend';
import { getTenantEmailFrom } from '@/lib/email/tenant-from';
import { renderRegistrationPendingEmail } from '@/lib/email/templates/registration-pending';
import { renderRegistrationAdminNotifyEmail } from '@/lib/email/templates/registration-admin-notify';
import { renderRegistrationApprovedEmail } from '@/lib/email/templates/registration-approved';

function normalizeEmails(csvOrEmails: string | null | undefined): string[] {
  if (!csvOrEmails) return [];
  return csvOrEmails
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendRegistrationPendingEmailToUser(options: {
  tenantId: string;
  tenantName: string;
  userEmail: string;
  userName: string;
}) {
  const { subject, html } = renderRegistrationPendingEmail({
    tenantName: options.tenantName,
    userName: options.userName,
  });
  const from = await getTenantEmailFrom(options.tenantId);
  const result = await sendEmail({
    to: options.userEmail,
    subject,
    html,
    ...(from ? { from } : {}),
  });
  if (result.skipped) console.info('[email] registration pending skipped:', result.reason);
}

export async function notifyTenantAdminsOfPendingRegistration(options: {
  tenantId: string;
  tenantName: string;
  userEmail: string;
  userName: string;
}) {
  const admins = await prisma.userTenant.findMany({
    where: { tenantId: options.tenantId, role: 'ADMIN', status: 'ACTIVE' },
    select: { user: { select: { email: true } } },
  });

  const adminEmails = admins.map((a) => a.user.email?.trim()).filter(Boolean) as string[];
  const fallback = normalizeEmails(process.env.REGISTRATION_ADMIN_NOTIFY_EMAILS);
  const to = Array.from(new Set([...adminEmails, ...fallback]));
  if (to.length === 0) return;

  const { subject, html } = renderRegistrationAdminNotifyEmail({
    tenantName: options.tenantName,
    userEmail: options.userEmail,
    userName: options.userName,
  });

  const from = await getTenantEmailFrom(options.tenantId);
  const result = await sendEmail({
    to,
    subject,
    html,
    ...(from ? { from } : {}),
  });
  if (result.skipped) console.info('[email] registration admin notify skipped:', result.reason);
}

export async function sendRegistrationApprovedEmailToUser(options: {
  tenantId: string;
  tenantName: string;
  userEmail: string;
  userName: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ?? '';
  const loginUrl = baseUrl ? `${baseUrl}/auth/login` : undefined;

  const { subject, html } = renderRegistrationApprovedEmail({
    tenantName: options.tenantName,
    userName: options.userName,
    loginUrl,
  });

  const from = await getTenantEmailFrom(options.tenantId);
  const result = await sendEmail({
    to: options.userEmail,
    subject,
    html,
    ...(from ? { from } : {}),
  });
  if (result.skipped) console.info('[email] registration approved skipped:', result.reason);
}

