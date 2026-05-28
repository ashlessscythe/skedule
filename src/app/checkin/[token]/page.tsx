import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { findNewerActiveQrToken } from '@/lib/checkin/qr-token';
import { getCheckinWindowState } from '@/lib/checkin/checkin-window';
import { CheckinCard, type CheckinAppointmentProps } from './ui';
import { CheckinStatusCard } from './checkin-status-card';
import { CheckinTooEarlyCard } from './checkin-too-early-card';
import { CheckinAlreadyCheckedInCard } from './checkin-already-checked-in-card';

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const now = new Date();

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: {
      appointment: {
        include: {
          tenant: { select: { name: true } },
          location: {
            select: {
              name: true,
              timeZone: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
          client: { select: { firstName: true, lastName: true, email: true } },
          staff: { select: { firstName: true, lastName: true } },
          type: { select: { name: true, durationMinutes: true } },
        },
      },
    },
  });

  if (!qr) notFound();

  const appointment = qr.appointment;
  const appointmentProps = toCheckinAppointmentProps(appointment);

  if (appointment.deletedAt) {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Check-in unavailable"
          message="This appointment is no longer available. Please contact your scheduling office for help."
        />
      </CheckinShell>
    );
  }

  if (appointment.status === 'CANCELLED') {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Appointment cancelled"
          message="This appointment was cancelled. Please contact your scheduling office if you have questions."
        />
      </CheckinShell>
    );
  }

  if (appointment.status === 'NO_SHOW') {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Check-in unavailable"
          message="This appointment is no longer available for check-in. Please contact your scheduling office."
        />
      </CheckinShell>
    );
  }

  if (appointment.status === 'COMPLETED') {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Visit completed"
          message="This appointment has already been completed. No further check-in is needed."
        />
      </CheckinShell>
    );
  }

  if (appointment.status === 'CHECKED_IN' || qr.usedAt) {
    return (
      <CheckinShell>
        <CheckinAlreadyCheckedInCard appointment={appointmentProps} />
      </CheckinShell>
    );
  }

  const windowState = getCheckinWindowState({
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    now,
  });

  if (windowState === 'closed') {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Check-in no longer available"
          message="Your appointment time has passed and this check-in link is no longer valid. Please contact your scheduling office if you need help."
        />
      </CheckinShell>
    );
  }

  const tokenExpired = qr.expiresAt.getTime() < now.getTime();
  if (tokenExpired) {
    const newer = await findNewerActiveQrToken({
      appointmentId: appointment.id,
      excludeToken: token,
      now,
    });
    if (newer) {
      return (
        <CheckinShell>
          <CheckinStatusCard
            title="This check-in link has been replaced"
            message="Please check your email for a newer confirmation or reminder with an updated check-in link. If you can't find it, contact your scheduling office."
          />
        </CheckinShell>
      );
    }
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Check-in link expired"
          message="This link is no longer valid. Please contact your scheduling office for assistance."
        />
      </CheckinShell>
    );
  }

  if (appointment.status !== 'SCHEDULED') {
    return (
      <CheckinShell>
        <CheckinStatusCard
          title="Check-in unavailable"
          message="Online check-in is not available for this appointment. Please contact your scheduling office."
        />
      </CheckinShell>
    );
  }

  if (windowState === 'too_early') {
    return (
      <CheckinShell>
        <CheckinTooEarlyCard appointment={appointmentProps} />
      </CheckinShell>
    );
  }

  return (
    <CheckinShell>
      <CheckinCard token={token} appointment={appointmentProps} />
    </CheckinShell>
  );
}

function toCheckinAppointmentProps(
  appointment: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    tenant: { name: string };
    location: CheckinAppointmentProps['location'];
    client: CheckinAppointmentProps['client'];
    staff: CheckinAppointmentProps['staff'];
    type: CheckinAppointmentProps['type'];
  }
): CheckinAppointmentProps {
  return {
    id: appointment.id,
    startTimeIso: appointment.startTime.toISOString(),
    endTimeIso: appointment.endTime.toISOString(),
    status: appointment.status,
    tenantName: appointment.tenant.name,
    location: appointment.location,
    client: appointment.client,
    staff: appointment.staff,
    type: appointment.type,
  };
}

function CheckinShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
        <p className="text-sm text-muted-foreground">Confirm your arrival for your appointment.</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
