import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { CreateStaffMemberDialog } from './ui/create-staff-member-dialog';
import { StaffMemberRowActions } from './ui/staff-member-row-actions';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function AdminStaffPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const members = await prisma.userTenant.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and permissions for the active tenant.
          </p>
        </div>
        <CreateStaffMemberDialog />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm">
                  No members yet.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm font-medium">
                    {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}{' '}
                    {!m.user.isActive ? (
                      <Badge variant="secondary" className="ml-2">
                        Disabled
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>{m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <StaffMemberRowActions
                      member={{
                        id: m.id,
                        role: m.role,
                        status: m.status,
                        email: m.user.email,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

