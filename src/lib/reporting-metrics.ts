export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export function computeNoShowRate(args: {
  completedCount: number;
  noShowCount: number;
}) {
  const denominator = args.completedCount + args.noShowCount;
  if (denominator <= 0) return 0;
  return args.noShowCount / denominator;
}

export function computeUtilization(args: { bookedMinutes: number; availableMinutes: number }) {
  if (args.availableMinutes <= 0) return 0;
  return args.bookedMinutes / args.availableMinutes;
}

export function minutesBetweenLocalTimes(args: { startTimeLocal: string; endTimeLocal: string }) {
  const parse = (s: string) => {
    const [hRaw, mRaw] = s.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  const start = parse(args.startTimeLocal);
  const end = parse(args.endTimeLocal);
  if (start === null || end === null) return 0;
  if (end <= start) return 0;
  return end - start;
}

export function countWeekdayOccurrencesInUtcDateRangeInclusive(args: {
  startDateUtc: Date;
  endDateUtc: Date;
  dayOfWeek: number; // 0 (Sun) ... 6 (Sat)
}) {
  const startMs = Date.UTC(
    args.startDateUtc.getUTCFullYear(),
    args.startDateUtc.getUTCMonth(),
    args.startDateUtc.getUTCDate()
  );
  const endMs = Date.UTC(
    args.endDateUtc.getUTCFullYear(),
    args.endDateUtc.getUTCMonth(),
    args.endDateUtc.getUTCDate()
  );
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  if (endMs < startMs) return 0;
  if (args.dayOfWeek < 0 || args.dayOfWeek > 6) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  let count = 0;
  for (let t = startMs; t <= endMs; t += dayMs) {
    const d = new Date(t);
    if (d.getUTCDay() === args.dayOfWeek) count += 1;
  }
  return count;
}

