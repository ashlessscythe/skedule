import type { Appointment, Client, Location, Tenant } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/resend';
import { getTenantEmailFrom } from '@/lib/email/tenant-from';
import { formatAppointmentWindowLocal } from '@/lib/email/format-appointment-local';
import { renderAppointmentConfirmationEmail } from '@/lib/email/templates/appointment-confirmation';
import { renderAppointmentUpdatedEmail } from '@/lib/email/templates/appointment-updated';
import { renderAppointmentCancelledEmail } from '@/lib/email/templates/appointment-cancelled';
import { renderAppointmentReminderEmail } from '@/lib/email/templates/appointment-reminder';
import {
  buildCheckinUrls,
  ensureAppointmentQrToken,
} from '@/lib/checkin/qr-token';
import type { EmailCheckinLinks } from '@/lib/email/templates/layout';

export type AppointmentEmailInclude = Appointment & {
  tenant: Pick<Tenant, 'name'>;
  location: Pick<Location, 'name' | 'timeZone'>;
  client: Pick<Client, 'firstName' | 'lastName' | 'email'>;
};

const apptEmailInclude = {
  tenant: { select: { name: true } },
  location: { select: { name: true, timeZone: true } },
  client: { select: { firstName: true, lastName: true, email: true } },
} as const;

export { apptEmailInclude };

function clientEmail(appt: AppointmentEmailInclude): string | null {
  const e = appt.client.email?.trim();
  return e || null;
}

async function checkinLinksForAppointment(
  appt: AppointmentEmailInclude
): Promise<EmailCheckinLinks | undefined> {
  if (appt.status !== 'SCHEDULED') return undefined;
  const qr = await ensureAppointmentQrToken({
    tenantId: appt.tenantId,
    appointmentId: appt.id,
    expiresAt: appt.endTime,
    rotate: false,
  });
  return buildCheckinUrls(qr.token);
}

function commonFields(appt: AppointmentEmailInclude) {
  const email = clientEmail(appt);
  if (!email) return null;
  const clientName = `${appt.client.firstName} ${appt.client.lastName}`.trim();
  const startTimeLocal = formatAppointmentWindowLocal({
    startUtc: appt.startTime,
    endUtc: appt.endTime,
    timeZone: appt.location.timeZone,
  });
  return {
    email,
    clientName,
    startTimeLocal,
    tenantName: appt.tenant.name,
    locationName: appt.location.name,
  };
}

export async function sendAppointmentBookedEmail(options: {
  appointmentId: string;
  seriesExtraCount?: number;
}): Promise<void> {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: options.appointmentId, deletedAt: null, status: 'SCHEDULED' },
      include: apptEmailInclude,
    });
    if (!appt) return;
    const fields = commonFields(appt);
    if (!fields) return;

    const checkin = await checkinLinksForAppointment(appt);
    const { subject, html } = renderAppointmentConfirmationEmail({
      tenantName: fields.tenantName,
      clientName: fields.clientName,
      startTimeLocal: fields.startTimeLocal,
      locationName: fields.locationName,
      seriesExtraCount: options.seriesExtraCount,
      checkin,
    });

    const from = await getTenantEmailFrom(appt.tenantId);
    const result = await sendEmail({ to: fields.email, subject, html, ...(from ? { from } : {}) });
    if (result.skipped) console.info('[email] booked skipped:', result.reason);
  } catch (e) {
    console.error('[email] booked failed', options.appointmentId, e);
  }
}

export async function sendAppointmentUpdatedEmailForClient(appt: AppointmentEmailInclude): Promise<void> {
  try {
    const fields = commonFields(appt);
    if (!fields) return;

    const checkin = await checkinLinksForAppointment(appt);
    const { subject, html } = renderAppointmentUpdatedEmail({
      tenantName: fields.tenantName,
      clientName: fields.clientName,
      startTimeLocal: fields.startTimeLocal,
      locationName: fields.locationName,
      checkin,
    });

    const from = await getTenantEmailFrom(appt.tenantId);
    const result = await sendEmail({ to: fields.email, subject, html, ...(from ? { from } : {}) });
    if (result.skipped) console.info('[email] updated skipped:', result.reason);
  } catch (e) {
    console.error('[email] updated failed', appt.id, e);
  }
}

export async function sendAppointmentCancelledEmailForClient(appt: AppointmentEmailInclude): Promise<void> {
  try {
    const fields = commonFields(appt);
    if (!fields) return;

    const { subject, html } = renderAppointmentCancelledEmail({
      tenantName: fields.tenantName,
      clientName: fields.clientName,
      startTimeLocal: fields.startTimeLocal,
      locationName: fields.locationName,
    });

    const from = await getTenantEmailFrom(appt.tenantId);
    const result = await sendEmail({ to: fields.email, subject, html, ...(from ? { from } : {}) });
    if (result.skipped) console.info('[email] cancelled skipped:', result.reason);
  } catch (e) {
    console.error('[email] cancelled failed', appt.id, e);
  }
}

export async function sendAppointmentReminderEmailForClient(appt: AppointmentEmailInclude): Promise<boolean> {
  const fields = commonFields(appt);
  if (!fields) return false;

  const checkin = await checkinLinksForAppointment(appt);
  const { subject, html } = renderAppointmentReminderEmail({
    tenantName: fields.tenantName,
    clientName: fields.clientName,
    startTimeLocal: fields.startTimeLocal,
    locationName: fields.locationName,
    checkin,
  });

  const from = await getTenantEmailFrom(appt.tenantId);
  const result = await sendEmail({ to: fields.email, subject, html, ...(from ? { from } : {}) });
  if (result.skipped) {
    console.info('[email] reminder skipped:', result.reason);
    return false;
  }
  return true;
}
