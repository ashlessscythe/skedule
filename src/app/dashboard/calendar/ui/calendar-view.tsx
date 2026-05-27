'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addDays, format, startOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  formatDashboardTimeRangeWithZoneHint,
  formatTimeZoneDisplayHint,
} from '@/lib/scheduling/time';
import { useViewerTimeZone } from '@/lib/scheduling/use-viewer-time-zone';

type LocationOption = { id: string; name: string; timeZone: string };
type StaffOption = { id: string; label: string };

type CalendarEvent = {
  id: string;
  kind: 'APPOINTMENT' | 'AVAILABILITY' | 'BLOCKED';
  title: string;
  startUtc: string;
  endUtc: string;
  locationId: string | null;
  staffId: string | null;
  locationName?: string | null;
  locationTimeZone?: string | null;
  staffLabel?: string | null;
};

export function CalendarView(props: {
  locations: LocationOption[];
  staff: StaffOption[];
  viewerRole: 'STAFF' | 'ADMIN';
  initialNowIso: string;
}) {
  const [locationId, setLocationId] = useState<string | 'ALL'>(props.locations[0]?.id ?? 'ALL');
  const [staffId, setStaffId] = useState<string | 'ALL'>('ALL');
  const [showAppointments, setShowAppointments] = useState(true);
  const [showAvailability, setShowAvailability] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date(props.initialNowIso));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const viewerTimeZone = useViewerTimeZone();

  const locationLabel = useMemo(() => {
    if (locationId === 'ALL') return 'All locations';
    return props.locations.find((l) => l.id === locationId)?.name ?? 'Location';
  }, [locationId, props.locations]);

  const nameLabel = useMemo(() => {
    if (staffId === 'ALL') return 'All staff';
    return props.staff.find((s) => s.id === staffId)?.label ?? 'Staff';
  }, [staffId, props.staff]);

  const displayTimeZone = useMemo(() => {
    const loc = props.locations.find((l) => l.id === locationId);
    if (loc?.timeZone) return loc.timeZone;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [props.locations, locationId]);

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    let cancelled = false;
    const start = weekStart.toISOString();
    const end = addDays(weekStart, 7).toISOString();

    const qs = new URLSearchParams();
    qs.set('start', start);
    qs.set('end', end);
    if (locationId !== 'ALL') qs.set('locationId', locationId);
    if (staffId !== 'ALL') qs.set('staffId', staffId);
    qs.set('includeAppointments', String(showAppointments));
    qs.set('includeAvailability', String(showAvailability));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/calendar/events?${qs.toString()}`, { method: 'GET' });
        if (!res.ok) {
          if (!cancelled) {
            setEvents([]);
            setWarnings([`Unable to load calendar (${res.status}).`]);
          }
          return;
        }
        const body = (await res.json()) as { events: CalendarEvent[]; warnings?: string[] };
        if (cancelled) return;
        setEvents(body.events ?? []);
        setWarnings(body.warnings ?? []);
      } catch {
        if (!cancelled) {
          setEvents([]);
          setWarnings(['Unable to load calendar.']);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [weekStart, locationId, staffId, showAppointments, showAvailability]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const d of days) {
      m.set(format(d, 'yyyy-MM-dd'), []);
    }
    for (const e of events) {
      const dayKey = formatInTimeZone(new Date(e.startUtc), displayTimeZone, 'yyyy-MM-dd');
      const arr = m.get(dayKey);
      if (arr) arr.push(e);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    }
    return m;
  }, [events, days, displayTimeZone]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">Location</div>
            <Select
              value={locationId}
              onValueChange={(v) => setLocationId(v === 'ALL' ? 'ALL' : v ?? '')}
            >
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[240px]" disabled={isPending}>
                <SelectValue>{locationLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All locations</SelectItem>
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
            <Select value={staffId} onValueChange={(v) => setStaffId(v === 'ALL' ? 'ALL' : v ?? '')}>
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[240px]" disabled={isPending}>
                <SelectValue>{nameLabel}</SelectValue>
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
            <div className="text-xs font-medium text-muted-foreground">Show</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={showAvailability ? 'default' : 'outline'}
                size="sm"
                disabled={isPending}
                onClick={() => setShowAvailability((v) => !v)}
              >
                Availability
              </Button>
              <Button
                type="button"
                variant={showAppointments ? 'default' : 'outline'}
                size="sm"
                disabled={isPending}
                onClick={() => setShowAppointments((v) => !v)}
              >
                Appointments
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setWeekAnchor((d) => addDays(d, -7))}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setWeekAnchor(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setWeekAnchor((d) => addDays(d, 7))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Times shown in{' '}
        <span className="font-mono">
          {formatTimeZoneDisplayHint(displayTimeZone, viewerTimeZone, weekAnchor)}
        </span>
        {props.viewerRole === 'ADMIN' ? (
          <span className="ml-2">• Admin</span>
        ) : (
          <span className="ml-2">• Staff</span>
        )}
      </div>

      {warnings.length ? (
        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:min-w-[980px] lg:grid-cols-7">
        {days.map((d) => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          return (
            <div
              key={dayKey}
              className="min-h-[220px] min-w-0 rounded-xl border border-border/60 bg-card/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50"
            >
              <div className="border-b border-border/60 bg-background/40 px-3 py-2">
                <div className="text-sm font-semibold tracking-tight" suppressHydrationWarning>
                  {formatInTimeZone(d, displayTimeZone, 'EEE')}
                </div>
                <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {formatInTimeZone(d, displayTimeZone, 'MMM d')}
                </div>
              </div>

              <div className="space-y-2 p-3">
                {dayEvents.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No events</div>
                ) : (
                  dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        'rounded-lg border px-2 py-1.5',
                        e.kind === 'APPOINTMENT'
                          ? 'border-primary/30 bg-primary/5'
                          : e.kind === 'BLOCKED'
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-emerald-500/30 bg-emerald-500/5'
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <div className="min-w-0 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {e.kind === 'APPOINTMENT'
                            ? 'Appointment'
                            : e.kind === 'BLOCKED'
                              ? 'Blocked'
                              : 'Availability'}
                        </div>
                        <div className="shrink-0 font-mono text-[0.7rem] text-muted-foreground">
                          {formatDashboardTimeRangeWithZoneHint(
                            e.startUtc,
                            e.endUtc,
                            e.locationTimeZone ?? displayTimeZone,
                            viewerTimeZone
                          )}
                        </div>
                      </div>
                      {e.kind === 'AVAILABILITY' || e.kind === 'BLOCKED' ? (
                        <div className="mt-1 space-y-1">
                          {(e.locationName || e.staffLabel) ? (
                            <div className="space-y-0.5 text-[0.65rem] leading-snug text-muted-foreground">
                              {e.locationName ? (
                                <div>
                                  <span className="text-muted-foreground/80">Location </span>
                                  {e.locationName}
                                </div>
                              ) : null}
                              {e.staffLabel ? (
                                <div>
                                  <span className="text-muted-foreground/80">Staff </span>
                                  {e.staffLabel}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="text-sm font-semibold leading-tight">{e.title}</div>
                        </div>
                      ) : (
                        <div className="mt-0.5 break-words text-xs">{e.title}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

