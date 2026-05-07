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
import { ResponsiveDataList } from '@/components/responsive-data-list';

export default async function AdminAppointmentTypesPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const types = await prisma.appointmentType.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Appointment types</h1>
          <p className="text-sm text-muted-foreground">
            Configure services and default durations for scheduling.
          </p>
        </div>
        <CreateAppointmentTypeDialog />
      </div>

      <ResponsiveDataList
        desktop={
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
        }
        mobile={
          <div className="rounded-lg border bg-card">
            {types.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No appointment types yet.
              </div>
            ) : (
              <ul className="divide-y">
                {types.map((t) => (
                  <li key={t.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm font-medium">{t.name}</div>
                      <div className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {t.durationMinutes} min
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.description ?? '—'}</p>
                    <AppointmentTypeRowActions type={t} />
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

