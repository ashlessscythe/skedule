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
import { ResponsiveDataList } from '@/components/responsive-data-list';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and permissions for the active tenant.
          </p>
        </div>
        <CreateStaffMemberDialog />
      </div>

      <ResponsiveDataList
        desktop={
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
        }
        mobile={
          <div className="rounded-lg border bg-card">
            {members.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No members yet.</div>
            ) : (
              <ul className="divide-y">
                {members.map((m) => (
                  <li key={m.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}
                      </span>
                      {!m.user.isActive ? (
                        <Badge variant="secondary" className="text-xs">
                          Disabled
                        </Badge>
                      ) : null}
                    </div>
                    <div className="break-all text-sm text-muted-foreground">{m.user.email}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>{m.role}</Badge>
                      <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {m.status}
                      </Badge>
                    </div>
                    <StaffMemberRowActions
                      member={{
                        id: m.id,
                        role: m.role,
                        status: m.status,
                        email: m.user.email,
                      }}
                    />
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

