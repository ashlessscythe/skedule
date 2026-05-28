import { formatAppointmentWindowLocal } from '@/lib/email/format-appointment-local';
import { formatLocationAddress } from '@/lib/appointment-client-links';
import { CheckinActions } from './checkin-actions';
import type { CheckinAppointmentProps } from './ui';

export function CheckinAppointmentPanel({
  appointment,
  actionsHeading,
  actionsHint,
  children,
}: {
  appointment: CheckinAppointmentProps;
  actionsHeading?: string;
  actionsHint?: string;
  children?: React.ReactNode;
}) {
  const startUtc = new Date(appointment.startTimeIso);
  const endUtc = new Date(appointment.endTimeIso);
  const whenLocal = formatAppointmentWindowLocal({
    startUtc,
    endUtc,
    timeZone: appointment.location.timeZone,
  });
  const addressFormatted = formatLocationAddress(appointment.location);
  const staffName = appointment.staff
    ? `${appointment.staff.firstName} ${appointment.staff.lastName}`
    : null;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Your appointment</h2>
        <p className="text-sm text-muted-foreground">
          {appointment.client.firstName} {appointment.client.lastName} — {appointment.tenantName}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">When:</span>{' '}
          <span className="font-medium">{whenLocal}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Where:</span>{' '}
          <span className="font-medium">{appointment.location.name}</span>
          {addressFormatted ? (
            <div className="mt-0.5 text-muted-foreground">{addressFormatted}</div>
          ) : null}
        </div>
        <div>
          <span className="text-muted-foreground">Service:</span>{' '}
          {appointment.type?.name ?? '—'}
        </div>
        <div>
          <span className="text-muted-foreground">Staff:</span>{' '}
          {staffName ?? 'Unassigned'}
        </div>
      </div>

      <CheckinActions
        appointmentId={appointment.id}
        tenantName={appointment.tenantName}
        serviceName={appointment.type?.name ?? null}
        staffName={staffName}
        location={appointment.location}
        startTimeIso={appointment.startTimeIso}
        endTimeIso={appointment.endTimeIso}
        heading={actionsHeading}
        hint={actionsHint}
      />

      {children}
    </div>
  );
}
