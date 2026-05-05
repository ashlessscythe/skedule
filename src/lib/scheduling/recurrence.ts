import { rrulestr } from 'rrule';

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

function formatUntilUtc(d: Date) {
  // RFC5545 UNTIL in UTC: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

