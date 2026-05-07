import { prisma } from '@/lib/prisma';

export type AuditLogFilters = {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  entityType?: string;
  userId?: string;
};

export function buildAuditLogWhere(filters: AuditLogFilters) {
  const createdAt =
    filters.startDate || filters.endDate
      ? {
          ...(filters.startDate ? { gte: filters.startDate } : {}),
          ...(filters.endDate ? { lte: filters.endDate } : {}),
        }
      : undefined;

  return {
    tenantId: filters.tenantId,
    ...(createdAt ? { createdAt } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
  };
}

export async function listAuditLogsForTenant(filters: AuditLogFilters) {
  const where = buildAuditLogWhere(filters);
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
}

