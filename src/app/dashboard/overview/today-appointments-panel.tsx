import Link from 'next/link';
import { AppointmentStatusBadge } from '@/app/dashboard/ui/appointment-status-badge';
import { formatDashboardDateTime } from '@/lib/scheduling/time';
import type { OverviewAppointmentRow } from './load-overview-data';

function clientName(row: OverviewAppointmentRow) {
  return `${row.clientFirstName} ${row.clientLastName}`.trim();
}

function staffName(row: OverviewAppointmentRow) {
  if (!row.staffId) return 'Unassigned';
  const name = `${row.staffFirstName ?? ''} ${row.staffLastName ?? ''}`.trim();
  return name || 'Staff';
}

type TodayAppointmentsPanelProps = {
  title: string;
  rows: OverviewAppointmentRow[];
  emptyMessage: string;
  viewAllHref: string;
  showStaff?: boolean;
};

export function TodayAppointmentsPanel({
  title,
  rows,
  emptyMessage,
  viewAllHref,
  showStaff = false,
}: TodayAppointmentsPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href="/dashboard/appointments"
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="truncate text-sm font-medium">{clientName(row)}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.typeName ? `${row.typeName} · ` : null}
                    {row.locationName}
                    {showStaff ? ` · ${staffName(row)}` : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDashboardDateTime(row.startTime, row.locationTimeZone)}
                  </div>
                </div>
                <AppointmentStatusBadge status={row.status} className="w-fit shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto border-t px-4 py-3">
        <Link href={viewAllHref} className="text-sm font-medium text-primary hover:underline">
          View all appointments
        </Link>
      </div>
    </div>
  );
}
