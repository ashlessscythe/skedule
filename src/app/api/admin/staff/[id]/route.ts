import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';
import { sendRegistrationApprovedEmailToUser } from '@/lib/email/registration-emails';

const UpdateMembershipSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'REJECTED']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const { id } = await params;

  const json = await req.json();
  const input = UpdateMembershipSchema.parse(json);
  if (!input.role && !input.status) {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
  }

  const existing = await prisma.userTenant.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, role: true, status: true, userId: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.userTenant.update({
    where: { id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'USER_UPDATED',
    entityType: 'UserTenant',
    entityId: updated.id,
    metadata: {
      userId: updated.userId,
      from: { role: existing.role, status: existing.status },
      to: { role: updated.role, status: updated.status },
    },
  });

  if (existing.status !== 'ACTIVE' && updated.status === 'ACTIVE') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true },
      });
      const email = updated.user.email?.trim();
      const userName = `${updated.user.firstName} ${updated.user.lastName}`.trim();
      if (tenant?.name && email) {
        await sendRegistrationApprovedEmailToUser({
          tenantId: ctx.tenantId,
          tenantName: tenant.name,
          userEmail: email,
          userName,
        });
      }
    } catch (e) {
      console.error('[admin/staff] approval email failed', updated.id, e);
    }
  }

  return NextResponse.json({
    id: updated.id,
    tenantId: updated.tenantId,
    userId: updated.userId,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt,
    user: updated.user,
  });
}

