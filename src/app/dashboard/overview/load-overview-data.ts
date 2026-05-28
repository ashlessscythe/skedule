import { prisma } from '@/lib/prisma';
import { computeNoShowRate } from '@/lib/reporting-metrics';
import type { TenantContext } from '@/lib/tenant-context';
import { getUtcWeekRange } from '@/lib/utc-week';
import { getUtcDayRange } from './get-utc-day-range';

export type OverviewAppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  locationName: string;
  locationTimeZone: string;
  clientFirstName: string;
  clientLastName: string;
  staffId: string | null;
  staffFirstName: string | null;
  staffLastName: string | null;
  typeName: string | null;
};

export type StaffOverviewData = {
  role: 'STAFF';
  tenantName: string;
  stats: {
    todayCount: number;
    weekCount: number;
    checkedInTodayCount: number;
  };
  todayAppointments: OverviewAppointmentRow[];
};

export type AdminOverviewData = {
  role: 'ADMIN';
  tenantName: string;
  pendingStaffCount: number;
  stats: {
    todayCount: number;
    weekScheduledCount: number;
    activeClientsCount: number;
    activeStaffCount: number;
    noShowRate7d: number;
  };
  todayTenantAppointments: OverviewAppointmentRow[];
  myTodayAppointments: OverviewAppointmentRow[];
};

export type OverviewData = StaffOverviewData | AdminOverviewData;

const appointmentInclude = {
  location: { select: { name: true, timeZone: true } },
  client: { select: { firstName: true, lastName: true } },
  staff: { select: { firstName: true, lastName: true } },
  type: { select: { name: true } },
} as const;

function mapAppointmentRow(
  a: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    staffId: string | null;
    location: { name: string; timeZone: string };
    client: { firstName: string; lastName: string };
    staff: { firstName: string | null; lastName: string | null } | null;
    type: { name: string } | null;
  }
): OverviewAppointmentRow {
  return {
    id: a.id,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status,
    locationName: a.location.name,
    locationTimeZone: a.location.timeZone,
    clientFirstName: a.client.firstName,
    clientLastName: a.client.lastName,
    staffId: a.staffId,
    staffFirstName: a.staff?.firstName ?? null,
    staffLastName: a.staff?.lastName ?? null,
    typeName: a.type?.name ?? null,
  };
}

const notCancelled = { not: 'CANCELLED' as const };

export async function loadOverviewData(ctx: TenantContext, now = new Date()): Promise<OverviewData> {
  const { start: dayStart, end: dayEnd } = getUtcDayRange(now);
  const { start: weekStart, end: weekEnd } = getUtcWeekRange(now);

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? ctx.tenantId;

  const todayWhere = {
    tenantId: ctx.tenantId,
    deletedAt: null,
    startTime: { gte: dayStart, lte: dayEnd },
    status: notCancelled,
  };

  const weekWhere = {
    tenantId: ctx.tenantId,
    deletedAt: null,
    startTime: { gte: weekStart, lte: weekEnd },
    status: notCancelled,
  };

  if (ctx.role === 'STAFF') {
    const staffFilter = { staffId: ctx.userId };

    const [todayCount, weekCount, checkedInTodayCount, todayRows] = await Promise.all([
      prisma.appointment.count({ where: { ...todayWhere, ...staffFilter } }),
      prisma.appointment.count({ where: { ...weekWhere, ...staffFilter } }),
      prisma.appointment.count({
        where: {
          ...todayWhere,
          ...staffFilter,
          status: 'CHECKED_IN',
        },
      }),
      prisma.appointment.findMany({
        where: { ...todayWhere, ...staffFilter },
        orderBy: { startTime: 'asc' },
        take: 8,
        include: appointmentInclude,
      }),
    ]);

    return {
      role: 'STAFF',
      tenantName,
      stats: { todayCount, weekCount, checkedInTodayCount },
      todayAppointments: todayRows.map(mapAppointmentRow),
    };
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const metricsWhere = {
    tenantId: ctx.tenantId,
    deletedAt: null,
    startTime: { gte: sevenDaysAgo, lte: now },
  };

  const [
    pendingStaffCount,
    todayCount,
    weekScheduledCount,
    activeClientsCount,
    activeStaffCount,
    completed7d,
    noShows7d,
    todayTenantRows,
    myTodayRows,
  ] = await Promise.all([
    prisma.userTenant.count({
      where: { tenantId: ctx.tenantId, status: 'PENDING' },
    }),
    prisma.appointment.count({ where: todayWhere }),
    prisma.appointment.count({
      where: { ...weekWhere, status: 'SCHEDULED' },
    }),
    prisma.client.count({
      where: { tenantId: ctx.tenantId, deletedAt: null },
    }),
    prisma.userTenant.count({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    }),
    prisma.appointment.count({
      where: { ...metricsWhere, status: 'COMPLETED' },
    }),
    prisma.appointment.count({
      where: { ...metricsWhere, status: 'NO_SHOW' },
    }),
    prisma.appointment.findMany({
      where: todayWhere,
      orderBy: { startTime: 'asc' },
      take: 10,
      include: appointmentInclude,
    }),
    prisma.appointment.findMany({
      where: { ...todayWhere, staffId: ctx.userId },
      orderBy: { startTime: 'asc' },
      take: 8,
      include: appointmentInclude,
    }),
  ]);

  const noShowRate7d = computeNoShowRate({
    completedCount: completed7d,
    noShowCount: noShows7d,
  });

  return {
    role: 'ADMIN',
    tenantName,
    pendingStaffCount,
    stats: {
      todayCount,
      weekScheduledCount,
      activeClientsCount,
      activeStaffCount,
      noShowRate7d,
    },
    todayTenantAppointments: todayTenantRows.map(mapAppointmentRow),
    myTodayAppointments: myTodayRows.map(mapAppointmentRow),
  };
}
