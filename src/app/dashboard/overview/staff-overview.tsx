import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import type { StaffOverviewData } from './load-overview-data';
import { StatCard } from './stat-card';
import { TodayAppointmentsPanel } from './today-appointments-panel';

export function StaffOverview({ data }: { data: StaffOverviewData }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{data.tenantName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Today" value={data.stats.todayCount} hint="Your appointments" />
        <StatCard label="This week" value={data.stats.weekCount} hint="Your appointments" />
        <StatCard label="Checked in today" value={data.stats.checkedInTodayCount} />
      </div>

      <TodayAppointmentsPanel
        title="Your schedule today"
        rows={data.todayAppointments}
        emptyMessage="No appointments today."
        viewAllHref="/dashboard/appointments"
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/appointments" className={buttonVariants({ variant: 'outline' })}>
          Appointments
        </Link>
        <Link href="/dashboard/calendar" className={buttonVariants({ variant: 'outline' })}>
          Calendar
        </Link>
        <Link href="/dashboard/clients" className={buttonVariants({ variant: 'outline' })}>
          Clients
        </Link>
        <Link
          href="/dashboard/appointments"
          className={buttonVariants({ variant: 'default' })}
        >
          Create appointment
        </Link>
      </div>
    </div>
  );
}
