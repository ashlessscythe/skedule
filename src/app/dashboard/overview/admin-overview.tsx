import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import type { AdminOverviewData } from './load-overview-data';
import { StatCard } from './stat-card';
import { TodayAppointmentsPanel } from './today-appointments-panel';

function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

export function AdminOverview({ data }: { data: AdminOverviewData }) {
  const pendingLabel =
    data.pendingStaffCount === 1
      ? '1 registration pending approval'
      : `${data.pendingStaffCount} registrations pending approval`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{data.tenantName}</p>
      </div>

      {data.pendingStaffCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">{pendingLabel}</p>
          <Link
            href="/dashboard/admin/staff?status=PENDING"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            Review registrations
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Today" value={data.stats.todayCount} hint="All appointments" />
        <StatCard label="Scheduled this week" value={data.stats.weekScheduledCount} />
        <StatCard label="Active clients" value={data.stats.activeClientsCount} />
        <StatCard label="Active staff" value={data.stats.activeStaffCount} />
        <StatCard
          label="No-show rate (7d)"
          value={formatPercent(data.stats.noShowRate7d)}
          hint="Completed + no-show"
        />
      </div>

      <TodayAppointmentsPanel
        title="Today at a glance"
        rows={data.todayTenantAppointments}
        emptyMessage="No appointments scheduled for today."
        viewAllHref="/dashboard/appointments"
        showStaff
      />

      <TodayAppointmentsPanel
        title="Your schedule today"
        rows={data.myTodayAppointments}
        emptyMessage="No appointments assigned to you today."
        viewAllHref="/dashboard/appointments"
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/reporting" className={buttonVariants({ variant: 'outline' })}>
          Reporting
        </Link>
        <Link href="/dashboard/admin/staff" className={buttonVariants({ variant: 'outline' })}>
          Staff
        </Link>
        <Link href="/dashboard/admin/locations" className={buttonVariants({ variant: 'outline' })}>
          Locations
        </Link>
        <Link href="/dashboard/appointments" className={buttonVariants({ variant: 'outline' })}>
          Appointments
        </Link>
        <Link href="/dashboard/calendar" className={buttonVariants({ variant: 'outline' })}>
          Calendar
        </Link>
      </div>
    </div>
  );
}
