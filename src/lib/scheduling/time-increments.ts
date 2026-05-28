/** 15-minute scheduling grid (seconds). Used for `datetime-local` step. */
export const DATETIME_LOCAL_QUARTER_HOUR_STEP = 15 * 60;

const QUARTER_HOUR_MINUTES = 15;

/** Round duration up to the next 15-minute boundary (minimum 15). */
export function roundDurationMinutesUp(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return QUARTER_HOUR_MINUTES;
  return Math.max(QUARTER_HOUR_MINUTES, Math.ceil(minutes / QUARTER_HOUR_MINUTES) * QUARTER_HOUR_MINUTES);
}

/** Snap a date up to the next 15-minute mark (seconds/ms cleared). */
export function snapDateToQuarterHour(date: Date): Date {
  const d = new Date(date);
  const fractionalMinutes =
    d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000;
  const onBoundary =
    fractionalMinutes % QUARTER_HOUR_MINUTES === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0;
  if (onBoundary) return d;

  const snappedMinutes =
    fractionalMinutes % QUARTER_HOUR_MINUTES === 0
      ? fractionalMinutes
      : Math.ceil(fractionalMinutes / QUARTER_HOUR_MINUTES) * QUARTER_HOUR_MINUTES;

  if (snappedMinutes >= 60) {
    const carryHours = Math.floor(snappedMinutes / 60);
    d.setHours(d.getHours() + carryHours, snappedMinutes % 60, 0, 0);
  } else {
    d.setMinutes(snappedMinutes, 0, 0);
  }
  return d;
}

export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Snap a `datetime-local` string up to the next 15-minute mark in local time. */
export function snapDateTimeLocalToQuarterHour(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return value;
  return toDateTimeLocalValue(snapDateToQuarterHour(parsed));
}

export function isQuarterHourDurationMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= QUARTER_HOUR_MINUTES && minutes % QUARTER_HOUR_MINUTES === 0;
}
