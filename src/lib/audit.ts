import { prisma } from '@/lib/prisma';
import type { AuditActionType } from '@prisma/client';

export async function writeAuditLog(args: {
  tenantId: string;
  userId?: string | null;
  action: AuditActionType;
  entityType: string;
  entityId: string;
  appointmentId?: string | null;
  clientId?: string | null;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: args.tenantId,
      userId: args.userId ?? null,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      appointmentId: args.appointmentId ?? null,
      clientId: args.clientId ?? null,
      metadata: args.metadata ?? undefined,
    },
  });
}

