import { formatInTimeZone } from 'date-fns-tz';
import { checkinOpensAt } from '@/lib/checkin/checkin-window';
import { CheckinAppointmentPanel } from './checkin-appointment-panel';
import type { CheckinAppointmentProps } from './ui';

export function CheckinTooEarlyCard({ appointment }: { appointment: CheckinAppointmentProps }) {
  const startUtc = new Date(appointment.startTimeIso);
  const opensAt = checkinOpensAt(startUtc);
  const opensAtLocal = formatInTimeZone(
    opensAt,
    appointment.location.timeZone,
    "EEEE, MMM d, yyyy 'at' h:mm a zzz"
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="text-sm font-medium">Too early to check in</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Online check-in opens 24 hours before your appointment, on {opensAtLocal}. Add a
          calendar reminder below and come back when check-in is open.
        </div>
      </div>
      <CheckinAppointmentPanel
        appointment={appointment}
        actionsHeading="Add a reminder"
        actionsHint="Save the appointment to your calendar so you get a reminder when check-in opens."
      />
    </div>
  );
}
