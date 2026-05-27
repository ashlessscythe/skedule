import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export type AvailabilityRowInput = {
  id: string;
  locationId: string;
  staffId: string | null;
  dayOfWeek: number | null;
  startTimeLocal: string | null;
  endTimeLocal: string | null;
  specificDate: Date | null;
  isBlocked: boolean;
};

export type AvailabilitySegment = {
  id: string;
  staffId: string | null;
  staffLabel: string;
  kind: 'OPEN' | 'BLOCKED';
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
};

const ALL_STAFF_LABEL = 'All staff';
const MINUTES_PER_DAY = 24 * 60;

function hhmmToMinutes(s: string) {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function filterAvailabilityRowsForStaff(
  rows: AvailabilityRowInput[],
  staffIdFilter?: string | null
): AvailabilityRowInput[] {
  if (!staffIdFilter) return rows;
  return rows.filter((r) => r.staffId === staffIdFilter || r.staffId === null);
}

export function expandAvailabilitySegments(args: {
  rows: AvailabilityRowInput[];
  timeZone: string;
  startUtc: Date;
  endUtc: Date;
  staffNameById: Map<string, string>;
  staffIdFilter?: string | null;
  maxDays?: number;
}): AvailabilitySegment[] {
  const filtered = filterAvailabilityRowsForStaff(args.rows, args.staffIdFilter);
  const tz = args.timeZone;
  const segments: AvailabilitySegment[] = [];

  const startDayKey = formatInTimeZone(args.startUtc, tz, 'yyyy-MM-dd');
  const startLocalMidnightUtc = fromZonedTime(`${startDayKey}T00:00:00`, tz);
  const maxDays = args.maxDays ?? 14;

  for (let i = 0; i < maxDays; i++) {
    const dayStartUtc = addDays(startLocalMidnightUtc, i);
    if (dayStartUtc >= args.endUtc) break;

    const dayKey = formatInTimeZone(dayStartUtc, tz, 'yyyy-MM-dd');
    const dayLocal = toZonedTime(dayStartUtc, tz);
    const dow = dayLocal.getDay();

    for (const r of filtered) {
      const staffLabel = r.staffId
        ? (args.staffNameById.get(r.staffId) ?? r.staffId)
        : ALL_STAFF_LABEL;

      if (r.specificDate) {
        const d = formatInTimeZone(r.specificDate, tz, 'yyyy-MM-dd');
        if (d !== dayKey) continue;
        segments.push({
          id: r.id,
          staffId: r.staffId,
          staffLabel,
          kind: r.isBlocked ? 'BLOCKED' : 'OPEN',
          dayKey,
          startMinutes: 0,
          endMinutes: MINUTES_PER_DAY,
        });
        continue;
      }

      if (r.dayOfWeek == null) continue;
      if (r.dayOfWeek !== dow) continue;
      if (!r.startTimeLocal || !r.endTimeLocal) continue;
      if (r.isBlocked) continue;

      const startMinutes = hhmmToMinutes(r.startTimeLocal);
      const endMinutes = hhmmToMinutes(r.endTimeLocal);
      if (endMinutes <= startMinutes) continue;

      segments.push({
        id: `${r.id}:${dayKey}`,
        staffId: r.staffId,
        staffLabel,
        kind: 'OPEN',
        dayKey,
        startMinutes,
        endMinutes,
      });
    }
  }

  return segments;
}

export function segmentRowKey(staffId: string | null): string {
  return staffId ?? '__all__';
}

export { ALL_STAFF_LABEL };
