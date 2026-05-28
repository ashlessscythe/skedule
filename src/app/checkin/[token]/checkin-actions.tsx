'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildIcsCalendarFile,
  formatLocationAddress,
  googleCalendarAddUrl,
  googleMapsUrlForLocation,
  icsDownloadFilename,
  type LocationAddressFields,
} from '@/lib/appointment-client-links';

export function CheckinActions({
  appointmentId,
  tenantName,
  serviceName,
  staffName,
  location,
  startTimeIso,
  endTimeIso,
}: {
  appointmentId: string;
  tenantName: string;
  serviceName: string | null;
  staffName: string | null;
  location: LocationAddressFields;
  startTimeIso: string;
  endTimeIso: string;
}) {
  const startUtc = new Date(startTimeIso);
  const endUtc = new Date(endTimeIso);
  const title = serviceName
    ? `${serviceName} — ${tenantName}`
    : `Appointment — ${tenantName}`;

  const detailsParts = [
    staffName ? `Staff: ${staffName}` : null,
    location.name ? `Location: ${location.name}` : null,
  ].filter(Boolean);

  const locationLabel =
    formatLocationAddress(location) ?? location.name;
  const calendarArgs = {
    title,
    startUtc,
    endUtc,
    location: locationLabel,
    details: detailsParts.join('\n') || undefined,
  };

  const googleCalUrl = googleCalendarAddUrl(calendarArgs);
  const mapsUrl = googleMapsUrlForLocation(location);

  function onDownloadIcs() {
    const ics = buildIcsCalendarFile({
      uid: `${appointmentId}@skedule`,
      title: calendarArgs.title,
      startUtc,
      endUtc,
      location: calendarArgs.location,
      description: calendarArgs.details,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsDownloadFilename({ startUtc, title });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Before you arrive
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={googleCalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'justify-center')}
        >
          Add to Google Calendar
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-center"
          onClick={onDownloadIcs}
        >
          Download .ics
        </Button>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'justify-center')}
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Use Google Calendar or download the .ics file for Apple Calendar, Outlook, and other apps.
      </p>
    </div>
  );
}
