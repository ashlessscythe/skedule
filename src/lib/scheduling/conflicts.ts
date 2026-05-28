import { prisma } from '@/lib/prisma';

export async function assertNoConflict(args: {
  tenantId: string;
  staffId?: string | null;
  locationId: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  excludeAppointmentId?: string;
}) {
  if (!args.staffId) return;

  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: args.tenantId,
      staffId: args.staffId,
      locationId: args.locationId,
      deletedAt: null,
      id: args.excludeAppointmentId ? { not: args.excludeAppointmentId } : undefined,
      startTime: { lt: args.endTimeUtc },
      endTime: { gt: args.startTimeUtc },
      status: { in: ['SCHEDULED', 'CHECKED_IN', 'COMPLETED'] },
    },
    select: { id: true, startTime: true, endTime: true },
  });

  if (conflict) {
    throw new Error(`Conflict with appointment ${conflict.id}`);
  }
}

