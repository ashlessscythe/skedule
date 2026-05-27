'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveDataList } from '@/components/responsive-data-list';
import { formatDashboardDateTimeWithZoneHint } from '@/lib/scheduling/time';
import { useViewerTimeZone } from '@/lib/scheduling/use-viewer-time-zone';

const PAGE_SIZE = 25;
const STAFF_UNASSIGNED = '__unassigned__';

export type AppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  locationId: string;
  locationName: string;
  locationTimeZone: string;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string | null;
  staffId: string | null;
  staffFirstName: string | null;
  staffLastName: string | null;
  typeId: string | null;
  typeName: string | null;
  typeDurationMinutes: number | null;
};

type Option = { id: string; label: string };

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'NO_SHOW':
      return 'outline';
    default:
      return 'outline';
  }
}

const STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

type SortKey = 'startTime' | 'client' | 'location' | 'staff' | 'service';

function compareLocale(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortRows(rows: AppointmentRow[], sort: SortKey, dir: 'asc' | 'desc') {
  const mult = dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((x, y) => {
    let c = 0;
    switch (sort) {
      case 'startTime':
        c = new Date(x.startTime).getTime() - new Date(y.startTime).getTime();
        break;
      case 'client': {
        const cx = `${x.clientLastName}\t${x.clientFirstName}`;
        const cy = `${y.clientLastName}\t${y.clientFirstName}`;
        c = compareLocale(cx, cy);
        break;
      }
      case 'location':
        c = compareLocale(x.locationName, y.locationName);
        break;
      case 'staff': {
        const sx = x.staffId
          ? `${x.staffLastName ?? ''}\t${x.staffFirstName ?? ''}`
          : '\uffff';
        const sy = y.staffId
          ? `${y.staffLastName ?? ''}\t${y.staffFirstName ?? ''}`
          : '\uffff';
        c = compareLocale(sx, sy);
        break;
      }
      case 'service':
        c = compareLocale(x.typeName ?? '', y.typeName ?? '');
        break;
      default:
        c = 0;
    }
    if (c !== 0) return c * mult;
    return compareLocale(x.id, y.id) * mult;
  });
  return out;
}

function useQuerySetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, sp]
  );
}

export function AppointmentsList(props: {
  rows: AppointmentRow[];
  locationOptions: Option[];
  clientOptions: Option[];
  staffOptions: Option[];
  typeOptions: Option[];
}) {
  const sp = useSearchParams();
  const setQuery = useQuerySetter();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    },
    []
  );

  const sort = (sp.get('sort') as SortKey | null) ?? 'startTime';
  const sortSafe: SortKey = ['startTime', 'client', 'location', 'staff', 'service'].includes(
    sort ?? ''
  )
    ? sort!
    : 'startTime';
  const dir = sp.get('dir') === 'desc' ? 'desc' : 'asc';
  const pageRaw = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const upcomingOnly = sp.get('upcoming') !== '0';
  const status = sp.get('status')?.trim() ?? '';
  const locationId = sp.get('locationId')?.trim() ?? '';
  const staffId = sp.get('staffId')?.trim() ?? '';
  const clientId = sp.get('clientId')?.trim() ?? '';
  const typeId = sp.get('typeId')?.trim() ?? '';
  const q = sp.get('q')?.trim().toLowerCase() ?? '';

  const [now] = useState(() => Date.now());
  const viewerTimeZone = useViewerTimeZone();

  const processed = useMemo(() => {
    let list = props.rows;
    if (upcomingOnly) {
      list = list.filter((r) => new Date(r.startTime).getTime() >= now);
    }
    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
      list = list.filter((r) => r.status === status);
    }
    if (locationId) list = list.filter((r) => r.locationId === locationId);
    if (clientId) list = list.filter((r) => r.clientId === clientId);
    if (typeId) list = list.filter((r) => r.typeId === typeId);
    if (staffId === STAFF_UNASSIGNED) list = list.filter((r) => !r.staffId);
    else if (staffId) list = list.filter((r) => r.staffId === staffId);
    if (q) {
      list = list.filter((r) => {
        const blob = [
          r.clientFirstName,
          r.clientLastName,
          r.clientEmail,
          r.locationName,
          r.typeName,
          r.staffFirstName,
          r.staffLastName,
          r.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return sortRows(list, sortSafe, dir);
  }, [
    props.rows,
    upcomingOnly,
    status,
    locationId,
    staffId,
    clientId,
    typeId,
    q,
    sortSafe,
    dir,
    now,
  ]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const page = Math.min(pageRaw, totalPages);
  const slice = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function patch(updates: Record<string, string | null | undefined>, resetPage?: boolean) {
    if (resetPage) setQuery({ ...updates, page: null });
    else setQuery(updates);
  }

  function setSort(next: SortKey) {
    if (next === sortSafe) {
      patch({ dir: dir === 'asc' ? 'desc' : 'asc' }, true);
    } else {
      patch({ sort: next, dir: 'asc' }, true);
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortSafe === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '';

  const headerBtn = (key: SortKey, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => setSort(key)}
    >
      {label}
      <span className="text-xs">{sortIndicator(key)}</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="appt-q">Search</Label>
            <Input
              id="appt-q"
              className="w-[min(100%,220px)]"
              placeholder="Client, staff, location…"
              defaultValue={sp.get('q') ?? ''}
              key={sp.get('q') ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                searchDebounce.current = setTimeout(() => {
                  setQuery({ q: v.trim() || null, page: null });
                }, 300);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status || 'all'}
              onValueChange={(v) => patch({ status: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[160px]">
                <span>{status || 'All'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Select
              value={locationId || 'all'}
              onValueChange={(v) => patch({ locationId: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[180px]">
                <span>
                  {locationId
                    ? props.locationOptions.find((o) => o.id === locationId)?.label ?? locationId
                    : 'All'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Location</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  {props.locationOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Staff</Label>
            <Select
              value={staffId || 'all'}
              onValueChange={(v) => {
                if (v === 'all') patch({ staffId: null }, true);
                else patch({ staffId: v }, true);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <span>
                  {staffId === STAFF_UNASSIGNED
                    ? 'Unassigned'
                    : staffId
                      ? props.staffOptions.find((o) => o.id === staffId)?.label ?? staffId
                      : 'All'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Staff</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value={STAFF_UNASSIGNED}>Unassigned</SelectItem>
                  {props.staffOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Client</Label>
            <Select
              value={clientId || 'all'}
              onValueChange={(v) => patch({ clientId: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[200px]">
                <span>
                  {clientId
                    ? props.clientOptions.find((o) => o.id === clientId)?.label ?? clientId
                    : 'All'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Client</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  {props.clientOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Service</Label>
            <Select
              value={typeId || 'all'}
              onValueChange={(v) => patch({ typeId: v === 'all' ? null : v }, true)}
            >
              <SelectTrigger className="w-[180px]">
                <span>
                  {typeId
                    ? props.typeOptions.find((o) => o.id === typeId)?.label ?? typeId
                    : 'All'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Service</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  {props.typeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={upcomingOnly}
              onChange={(e) => patch({ upcoming: e.target.checked ? null : '0' }, true)}
            />
            Upcoming only
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {processed.length} appointment{processed.length !== 1 ? 's' : ''} match · Times at each
          location (labeled local time or zone) · {PAGE_SIZE} per page
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => patch({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => patch({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <ResponsiveDataList
        desktop={
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{headerBtn('startTime', 'When')}</TableHead>
                  <TableHead>{headerBtn('client', 'Client')}</TableHead>
                  <TableHead>{headerBtn('service', 'Service')}</TableHead>
                  <TableHead>{headerBtn('staff', 'Staff')}</TableHead>
                  <TableHead>{headerBtn('location', 'Location')}</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm">
                      No appointments match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  slice.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDashboardDateTimeWithZoneHint(
                          a.startTime,
                          a.locationTimeZone,
                          viewerTimeZone
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {a.clientFirstName} {a.clientLastName}
                        </div>
                        {a.clientEmail ? (
                          <div className="text-xs text-muted-foreground">{a.clientEmail}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{a.typeName ?? '—'}</div>
                        {a.typeDurationMinutes != null ? (
                          <div className="text-xs text-muted-foreground">
                            {a.typeDurationMinutes} min
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {a.staffId ? (
                          <div className="text-sm">
                            {a.staffFirstName} {a.staffLastName}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{a.locationName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
        mobile={
          <div className="rounded-lg border bg-card">
            {slice.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No appointments match your filters.
              </div>
            ) : (
              <ul className="divide-y">
                {slice.map((a) => (
                  <li key={a.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-muted-foreground">When</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {formatDashboardDateTimeWithZoneHint(
                          a.startTime,
                          a.locationTimeZone,
                          viewerTimeZone
                        )}
                        </div>
                      </div>
                      <Badge variant={statusVariant(a.status)} className="shrink-0">
                        {a.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Client</div>
                      <div className="text-sm font-medium">
                        {a.clientFirstName} {a.clientLastName}
                      </div>
                      {a.clientEmail ? (
                        <div className="break-all text-xs text-muted-foreground">{a.clientEmail}</div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Service</div>
                        <div className="text-sm">{a.typeName ?? '—'}</div>
                        {a.typeDurationMinutes != null ? (
                          <div className="text-xs text-muted-foreground">
                            {a.typeDurationMinutes} min
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Staff</div>
                        {a.staffId ? (
                          <div className="text-sm">
                            {a.staffFirstName} {a.staffLastName}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-xs font-medium text-muted-foreground">Location</div>
                        <div className="text-sm">{a.locationName}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />
    </div>
  );
}
