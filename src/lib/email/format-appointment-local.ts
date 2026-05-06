import { formatInTimeZone } from 'date-fns-tz';

/** Single line for email: local date + start–end times in location TZ. */
export function formatAppointmentWindowLocal(args: {
  startUtc: Date;
  endUtc: Date;
  timeZone: string;
}): string {
  const { startUtc, endUtc, timeZone } = args;
  const datePart = formatInTimeZone(startUtc, timeZone, "EEEE, MMM d, yyyy 'at' h:mm a");
  const endPart = formatInTimeZone(endUtc, timeZone, 'h:mm a zzz');
  return `${datePart} – ${endPart}`;
}
