import { rrulestr } from 'rrule';

/** Hard cap on total instances in a series (including the first occurrence). */
export const MAX_RECURRENCE_SERIES_INSTANCES = 366;

export type RecurrenceInput = {
  frequency: string;
  interval?: number;
  byWeekDay?: string | null;
  byMonthDay?: string | null;
  count?: number | null;
  until?: Date | null;
};

// Plan stores an RFC5545-like subset as strings. This converts that into an RRule string.
export function toRRuleString(input: RecurrenceInput) {
  const parts: string[] = [];
  parts.push(`FREQ=${input.frequency}`);
  parts.push(`INTERVAL=${input.interval ?? 1}`);
  if (input.byWeekDay) parts.push(`BYDAY=${input.byWeekDay}`);
  if (input.byMonthDay) parts.push(`BYMONTHDAY=${input.byMonthDay}`);
  if (input.count != null) parts.push(`COUNT=${input.count}`);
  if (input.until) parts.push(`UNTIL=${formatUntilUtc(input.until)}`);
  return `RRULE:${parts.join(';')}`;
}

export function occurrencesBetween(args: {
  rrule: string;
  dtStartUtc: Date;
  fromUtc: Date;
  toUtc: Date;
  limit?: number;
}) {
  const rule = rrulestr(args.rrule, { dtstart: args.dtStartUtc });
  const dates = rule.between(args.fromUtc, args.toUtc, true);
  return args.limit ? dates.slice(0, args.limit) : dates;
}

/**
 * Returns start times for occurrences after the first (dtStartUtc is always occurrence 1).
 * Requires either `count` (total instances including first) or `until` (UTC end boundary).
 */
export function expandRecurrenceExtraStartTimes(args: {
  recurrence: RecurrenceInput;
  dtStartUtc: Date;
}): Date[] {
  const { recurrence, dtStartUtc } = args;
  const hasCount = recurrence.count != null;
  const hasUntil = recurrence.until != null;
  if (!hasCount && !hasUntil) {
    throw new Error('Recurrence requires either count or until');
  }
  if (hasCount && hasUntil) {
    throw new Error('Use either count or until for recurrence, not both');
  }

  if (hasCount) {
    const n = recurrence.count!;
    if (n < 2) throw new Error('Recurrence count must be at least 2');
    if (n > MAX_RECURRENCE_SERIES_INSTANCES) {
      throw new Error(`Recurrence count cannot exceed ${MAX_RECURRENCE_SERIES_INSTANCES}`);
    }
  }

  if (hasUntil) {
    const until = recurrence.until!;
    if (until.getTime() <= dtStartUtc.getTime()) {
      throw new Error('Recurrence until must be after the start time');
    }
  }

  const rruleLine = toRRuleString(recurrence);
  const rule = rrulestr(rruleLine, { dtstart: dtStartUtc });

  const all = rule.all();
  if (all.length > MAX_RECURRENCE_SERIES_INSTANCES) {
    throw new Error(
      `Recurrence exceeds ${MAX_RECURRENCE_SERIES_INSTANCES} instances; reduce count or until range.`
    );
  }

  if (all.length <= 1) return [];
  return all.slice(1);
}

function formatUntilUtc(d: Date) {
  // RFC5545 UNTIL in UTC: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

