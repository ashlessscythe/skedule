import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export function formatUtcInTimeZone(utc: Date, timeZone: string, fmt = 'yyyy-MM-dd HH:mm') {
  return formatInTimeZone(utc, timeZone, fmt);
}

export function utcToZoned(utc: Date, timeZone: string) {
  return toZonedTime(utc, timeZone);
}

