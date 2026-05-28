import { CheckinAppointmentPanel } from './checkin-appointment-panel';
import type { CheckinAppointmentProps } from './ui';

export function CheckinAlreadyCheckedInCard({
  appointment,
}: {
  appointment: CheckinAppointmentProps;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="text-sm font-medium">Already checked in</div>
        <div className="mt-1 text-sm text-muted-foreground">
          You&apos;re all set — we&apos;ve recorded your check-in.
        </div>
      </div>
      <CheckinAppointmentPanel appointment={appointment} />
    </div>
  );
}
