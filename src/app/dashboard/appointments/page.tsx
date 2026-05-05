import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'NO_SHOW':
      return 'outline';
    default:
      return 'outline';
  }
}

export default async function AppointmentsPage() {
  const ctx = await getTenantContext();

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { startTime: 'asc' },
    take: 50,
    include: {
      location: { select: { name: true, timeZone: true } },
      client: { select: { firstName: true, lastName: true, email: true } },
      staff: { select: { firstName: true, lastName: true, email: true } },
      type: { select: { name: true, durationMinutes: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Showing latest 50 appointments for your active tenant.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When (UTC)</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm">
                  No appointments found.
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.startTime.toISOString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {a.client.firstName} {a.client.lastName}
                    </div>
                    {a.client.email ? (
                      <div className="text-xs text-muted-foreground">
                        {a.client.email}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{a.type?.name ?? '—'}</div>
                    {a.type?.durationMinutes ? (
                      <div className="text-xs text-muted-foreground">
                        {a.type.durationMinutes} min
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {a.staff ? (
                      <div className="text-sm">
                        {a.staff.firstName} {a.staff.lastName}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{a.location.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(a.status)}>
                      {a.status}
                    </Badge>
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

