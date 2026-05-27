import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/** Calendar event chips and appointment list rows (location wall clock). */
export const DASHBOARD_TIME_OF_DAY_FORMAT = 'HH:mm';
export const DASHBOARD_DATETIME_FORMAT = 'MMM d, yyyy HH:mm';

export function formatUtcInTimeZone(
  utc: Date | string,
  timeZone: string,
  fmt = 'yyyy-MM-dd HH:mm'
) {
  const instant = typeof utc === 'string' ? new Date(utc) : utc;
  return formatInTimeZone(instant, timeZone, fmt);
}

export function formatDashboardDateTime(utc: Date | string, timeZone: string) {
  return formatUtcInTimeZone(utc, timeZone, DASHBOARD_DATETIME_FORMAT);
}

export function formatDashboardTimeOfDay(utc: Date | string, timeZone: string) {
  return formatUtcInTimeZone(utc, timeZone, DASHBOARD_TIME_OF_DAY_FORMAT);
}

/** Viewer IANA zone (browser). Use a fallback in tests or SSR. */
export function resolveViewerTimeZone(fallback = 'UTC'): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

/** Label shown beside wall-clock times: local time vs location zone + UTC offset. */
export function formatTimeZoneDisplayHint(
  locationTimeZone: string,
  viewerTimeZone: string,
  at: Date | string = new Date()
): string {
  if (locationTimeZone === viewerTimeZone) {
    return 'local time';
  }
  const instant = typeof at === 'string' ? new Date(at) : at;
  return `${locationTimeZone} · ${formatUtcOffsetLabel(instant, locationTimeZone)}`;
}

function formatUtcOffsetLabel(at: Date, timeZone: string): string {
  const iso = formatInTimeZone(at, timeZone, 'XXX');
  if (iso === 'Z' || iso === '+00:00') return 'UTC';
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, sign, hh, mm] = match;
  const hours = parseInt(hh, 10);
  if (mm === '00') return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${mm}`;
}

export function formatDashboardDateTimeWithZoneHint(
  utc: Date | string,
  locationTimeZone: string,
  viewerTimeZone: string
): string {
  const at = typeof utc === 'string' ? utc : utc.toISOString();
  return `${formatDashboardDateTime(utc, locationTimeZone)} (${formatTimeZoneDisplayHint(
    locationTimeZone,
    viewerTimeZone,
    at
  )})`;
}

export function formatDashboardTimeRangeWithZoneHint(
  startUtc: Date | string,
  endUtc: Date | string,
  locationTimeZone: string,
  viewerTimeZone: string
): string {
  const at = typeof startUtc === 'string' ? startUtc : startUtc.toISOString();
  const range = `${formatDashboardTimeOfDay(startUtc, locationTimeZone)}–${formatDashboardTimeOfDay(
    endUtc,
    locationTimeZone
  )}`;
  return `${range} (${formatTimeZoneDisplayHint(locationTimeZone, viewerTimeZone, at)})`;
}

export function utcToZoned(utc: Date, timeZone: string) {
  return toZonedTime(utc, timeZone);
}

