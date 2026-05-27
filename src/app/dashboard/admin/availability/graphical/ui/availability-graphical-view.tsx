'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatTimeZoneDisplayHint } from '@/lib/scheduling/time';
import { useViewerTimeZone } from '@/lib/scheduling/use-viewer-time-zone';
import {
  ALL_STAFF_LABEL,
  segmentRowKey,
  type AvailabilitySegment,
} from '@/lib/scheduling/expand-availability-segments';
import { CreateAvailabilityDialog } from '../../ui/create-availability-dialog';

type LocationOption = { id: string; name: string; timeZone: string };
type StaffOption = { id: string; label: string };

type TimelineRow = { key: string; label: string };

const DEFAULT_AXIS_START = 6 * 60;
const DEFAULT_AXIS_END = 22 * 60;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatMinutesLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function dayRangeUtc(dayKey: string, timeZone: string) {
  const start = fromZonedTime(`${dayKey}T00:00:00`, timeZone);
  const end = addDays(start, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function weekRangeUtc(anchor: Date, timeZone: string) {
  const anchorDayKey = formatInTimeZone(anchor, timeZone, 'yyyy-MM-dd');
  const midnight = fromZonedTime(`${anchorDayKey}T00:00:00`, timeZone);
  const dow = toZonedTime(midnight, timeZone).getDay();
  const daysFromMonday = (dow + 6) % 7;
  const mondayStart = addDays(midnight, -daysFromMonday);
  const weekEnd = addDays(mondayStart, 7);
  return { start: mondayStart.toISOString(), end: weekEnd.toISOString(), mondayStart };
}

function weekDayKeys(mondayStart: Date, timeZone: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mondayStart, i);
    return formatInTimeZone(d, timeZone, 'yyyy-MM-dd');
  });
}

function computeTimeAxis(segments: AvailabilitySegment[], dayKey?: string) {
  const relevant = dayKey ? segments.filter((s) => s.dayKey === dayKey) : segments;
  if (relevant.length === 0) {
    return { start: DEFAULT_AXIS_START, end: DEFAULT_AXIS_END };
  }
  let min = Math.min(...relevant.map((s) => s.startMinutes));
  let max = Math.max(...relevant.map((s) => s.endMinutes));
  min = Math.max(0, min - 60);
  max = Math.min(24 * 60, max + 60);
  if (max - min < 120) {
    min = Math.max(0, min - 60);
    max = Math.min(24 * 60, max + 60);
  }
  return { start: min, end: max };
}

export function buildTimelineRows(args: {
  segments: AvailabilitySegment[];
  staffFilter: string | 'ALL';
  staff: StaffOption[];
}): TimelineRow[] {
  const keysWithSegments = new Set(args.segments.map((s) => segmentRowKey(s.staffId)));

  if (args.staffFilter !== 'ALL') {
    const rows: TimelineRow[] = [];
    if (keysWithSegments.has('__all__')) {
      rows.push({ key: '__all__', label: ALL_STAFF_LABEL });
    }
    const person = args.staff.find((s) => s.id === args.staffFilter);
    rows.push({
      key: args.staffFilter,
      label: person?.label ?? args.staffFilter,
    });
    return rows;
  }

  const rows: TimelineRow[] = [{ key: '__all__', label: ALL_STAFF_LABEL }];
  for (const s of args.staff) {
    rows.push({ key: s.id, label: s.label });
  }
  return rows;
}

function TimelineBar(props: {
  segment: AvailabilitySegment;
  axisStart: number;
  axisEnd: number;
}) {
  const span = props.axisEnd - props.axisStart;
  const left = ((props.segment.startMinutes - props.axisStart) / span) * 100;
  const width = ((props.segment.endMinutes - props.segment.startMinutes) / span) * 100;

  return (
    <div
      data-testid="availability-bar"
      data-kind={props.segment.kind}
      title={`${props.segment.staffLabel} · ${formatMinutesLabel(props.segment.startMinutes)}–${formatMinutesLabel(props.segment.endMinutes)}`}
      className={cn(
        'absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border',
        props.segment.kind === 'BLOCKED'
          ? 'border-destructive/40 bg-destructive/30'
          : 'border-emerald-500/40 bg-emerald-500/30'
      )}
      style={{
        left: `${Math.max(0, left)}%`,
        width: `${Math.max(2, width)}%`,
      }}
    />
  );
}

function DayChart(props: {
  rows: TimelineRow[];
  segments: AvailabilitySegment[];
  dayKey: string;
  axisStart: number;
  axisEnd: number;
}) {
  const ticks = useMemo(() => {
    const result: number[] = [];
    const step = 120;
    for (let m = props.axisStart; m <= props.axisEnd; m += step) {
      result.push(m);
    }
    return result;
  }, [props.axisStart, props.axisEnd]);

  return (
    <div className="min-w-[640px]">
      <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
        <div />
        <div className="relative h-6">
          {ticks.map((m) => {
            const left = ((m - props.axisStart) / (props.axisEnd - props.axisStart)) * 100;
            return (
              <span
                key={m}
                className="absolute -translate-x-1/2 font-mono text-[0.65rem] text-muted-foreground"
                style={{ left: `${left}%` }}
              >
                {formatMinutesLabel(m)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {props.rows.map((row) => {
          const rowSegments = props.segments.filter(
            (s) => segmentRowKey(s.staffId) === row.key && s.dayKey === props.dayKey
          );
          return (
            <div key={row.key} className="grid grid-cols-[140px_1fr] gap-2 py-3">
              <div className="truncate pr-2 text-sm font-medium" data-testid="timeline-row-label">
                {row.label}
              </div>
              <div className="relative h-10 rounded-md border border-border/50 bg-muted/20">
                {rowSegments.length === 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    —
                  </span>
                ) : (
                  rowSegments.map((seg) => (
                    <TimelineBar
                      key={seg.id}
                      segment={seg}
                      axisStart={props.axisStart}
                      axisEnd={props.axisEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekChart(props: {
  rows: TimelineRow[];
  segments: AvailabilitySegment[];
  dayKeys: string[];
  timeZone: string;
}) {
  return (
    <div className="min-w-[980px]">
      <div
        className="grid gap-2 border-b border-border/60 pb-2"
        style={{ gridTemplateColumns: `140px repeat(${props.dayKeys.length}, minmax(100px, 1fr))` }}
      >
        <div />
        {props.dayKeys.map((dayKey) => (
          <div key={dayKey} className="text-center text-xs font-medium text-muted-foreground">
            <div suppressHydrationWarning>
              {formatInTimeZone(fromZonedTime(`${dayKey}T12:00:00`, props.timeZone), props.timeZone, 'EEE')}
            </div>
            <div className="font-mono" suppressHydrationWarning>
              {formatInTimeZone(fromZonedTime(`${dayKey}T12:00:00`, props.timeZone), props.timeZone, 'MMM d')}
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/40">
        {props.rows.map((row) => (
          <div
            key={row.key}
            className="grid gap-2 py-3"
            style={{ gridTemplateColumns: `140px repeat(${props.dayKeys.length}, minmax(100px, 1fr))` }}
          >
            <div className="truncate pr-2 text-sm font-medium" data-testid="timeline-row-label">
              {row.label}
            </div>
            {props.dayKeys.map((dayKey) => {
              const cellSegments = props.segments.filter(
                (s) => segmentRowKey(s.staffId) === row.key && s.dayKey === dayKey
              );
              const axis = computeTimeAxis(cellSegments);
              return (
                <div
                  key={`${row.key}-${dayKey}`}
                  className="relative h-[140px] rounded-md border border-border/50 bg-muted/20"
                >
                  {cellSegments.length === 0 ? (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      —
                    </span>
                  ) : (
                    cellSegments.map((seg) => (
                      <TimelineBar
                        key={seg.id}
                        segment={seg}
                        axisStart={axis.start}
                        axisEnd={axis.end}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AvailabilityGraphicalView(props: {
  locations: LocationOption[];
  staff: StaffOption[];
  initialNowIso: string;
}) {
  const [locationId, setLocationId] = useState(props.locations[0]?.id ?? '');
  const [staffId, setStaffId] = useState<string | 'ALL'>('ALL');
  const [viewType, setViewType] = useState<'day' | 'week'>('week');
  const [anchor, setAnchor] = useState(() => new Date(props.initialNowIso));
  const [segments, setSegments] = useState<AvailabilitySegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const viewerTimeZone = useViewerTimeZone();

  const location = useMemo(
    () => props.locations.find((l) => l.id === locationId),
    [props.locations, locationId]
  );

  const displayTimeZone = location?.timeZone ?? viewerTimeZone;

  const dayKey = useMemo(
    () => formatInTimeZone(anchor, displayTimeZone, 'yyyy-MM-dd'),
    [anchor, displayTimeZone]
  );

  const weekMeta = useMemo(() => {
    if (!location) return null;
    const range = weekRangeUtc(anchor, location.timeZone);
    return {
      ...range,
      dayKeys: weekDayKeys(range.mondayStart, location.timeZone),
    };
  }, [anchor, location]);

  const fetchRange = useMemo(() => {
    if (!location) return null;
    if (viewType === 'day') {
      return dayRangeUtc(dayKey, location.timeZone);
    }
    if (!weekMeta) return null;
    return { start: weekMeta.start, end: weekMeta.end };
  }, [location, viewType, dayKey, weekMeta]);

  useEffect(() => {
    if (!locationId || !fetchRange) return;
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set('locationId', locationId);
    qs.set('start', fetchRange.start);
    qs.set('end', fetchRange.end);
    if (staffId !== 'ALL') qs.set('staffId', staffId);

    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/availability/timeline?${qs.toString()}`);
        if (!res.ok) {
          if (!cancelled) {
            setSegments([]);
            setError(`Unable to load timeline (${res.status}).`);
          }
          return;
        }
        const body = (await res.json()) as { segments: AvailabilitySegment[] };
        if (!cancelled) setSegments(body.segments ?? []);
      } catch {
        if (!cancelled) {
          setSegments([]);
          setError('Unable to load timeline.');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [locationId, staffId, fetchRange, fetchRange?.start, fetchRange?.end]);

  const rows = useMemo(
    () =>
      buildTimelineRows({
        segments,
        staffFilter: staffId,
        staff: props.staff,
      }),
    [segments, staffId, props.staff]
  );

  const dayAxis = useMemo(() => computeTimeAxis(segments, dayKey), [segments, dayKey]);

  const locationLabel = location?.name ?? 'Location';
  const staffLabel =
    staffId === 'ALL' ? 'All staff' : (props.staff.find((s) => s.id === staffId)?.label ?? 'Staff');

  function shiftAnchor(days: number) {
    setAnchor((d) => addDays(d, days));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Availability (graphical)</h1>
          <p className="text-sm text-muted-foreground">
            Timeline of open windows and blocked dates by staff and location.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline">
            <Link href="/dashboard/admin/availability">Switch to list view</Link>
          </Button>
          <CreateAvailabilityDialog
            locations={props.locations.map((l) => ({ id: l.id, name: l.name }))}
            staff={props.staff}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">Location</div>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? '')}>
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[220px]" disabled={isPending}>
                <SelectValue>{locationLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {props.locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">Staff</div>
            <Select
              value={staffId}
              onValueChange={(v) => setStaffId(v === 'ALL' ? 'ALL' : (v ?? 'ALL'))}
            >
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[220px]" disabled={isPending}>
                <SelectValue>{staffLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All staff</SelectItem>
                {props.staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">View type</div>
            <Select
              value={viewType}
              onValueChange={(v) => setViewType(v === 'day' ? 'day' : 'week')}
            >
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[140px]" disabled={isPending}>
                <SelectValue>{viewType === 'day' ? 'Day' : 'Week'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewType === 'day' ? (
            <div className="grid gap-1">
              <div className="text-xs font-medium text-muted-foreground">Date</div>
              <Input
                type="date"
                className="h-8 w-[160px]"
                value={dayKey}
                disabled={isPending}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || !location) return;
                  setAnchor(fromZonedTime(`${v}T12:00:00`, location.timeZone));
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => shiftAnchor(viewType === 'day' ? -1 : -7)}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setAnchor(new Date(props.initialNowIso))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => shiftAnchor(viewType === 'day' ? 1 : 7)}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Times shown in{' '}
        <span className="font-mono">
          {formatTimeZoneDisplayHint(displayTimeZone, viewerTimeZone, anchor)}
        </span>
        <span className="ml-3 inline-flex gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm border border-emerald-500/40 bg-emerald-500/30" />
            Open
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm border border-destructive/40 bg-destructive/30" />
            Blocked
          </span>
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {error}
        </div>
      ) : null}

      {!locationId ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Add a location to view availability.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {viewType === 'day' ? (
            <DayChart
              rows={rows}
              segments={segments}
              dayKey={dayKey}
              axisStart={dayAxis.start}
              axisEnd={dayAxis.end}
            />
          ) : weekMeta ? (
            <WeekChart
              rows={rows}
              segments={segments}
              dayKeys={weekMeta.dayKeys}
              timeZone={displayTimeZone}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
