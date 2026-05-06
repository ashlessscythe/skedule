import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { CreateAppointmentTypeDialog } from './ui/create-appointment-type-dialog';
import { AppointmentTypeRowActions } from './ui/appointment-type-row-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function AdminAppointmentTypesPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const types = await prisma.appointmentType.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Appointment types</h1>
          <p className="text-sm text-muted-foreground">
            Configure services and default durations for scheduling.
          </p>
        </div>
        <CreateAppointmentTypeDialog />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  No appointment types yet.
                </TableCell>
              </TableRow>
            ) : (
              types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">{t.durationMinutes} min</TableCell>
                  <TableCell className="text-right">
                    <AppointmentTypeRowActions type={t} />
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

