/** 00:00:00.000 UTC through 23:59:59.999 UTC for the UTC calendar day containing `ref`. */
export function getUtcDayRange(ref: Date): { start: Date; end: Date } {
  const d = new Date(ref);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}
