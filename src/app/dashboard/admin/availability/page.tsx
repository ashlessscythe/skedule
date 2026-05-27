import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { Button } from '@/components/ui/button';
import { CreateAvailabilityDialog } from './ui/create-availability-dialog';
import { AvailabilityRowActions } from './ui/availability-row-actions';
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

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default async function AdminAvailabilityPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const [locations, staffUsers, rows] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE', role: 'STAFF' },
      select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.availability.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ locationId: 'asc' }, { dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
    }),
  ]);

  const locationName = new Map(locations.map((l) => [l.id, l.name]));
  const staffName = new Map(
    staffUsers
      .map((s) => s.user)
      .filter(Boolean)
      .map((u) => [
        u!.id,
        `${u!.firstName} ${u!.lastName}`.trim() || u!.email,
      ])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
          <p className="text-sm text-muted-foreground">
            Configure weekly windows and blocked dates for scheduling validation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline">
            <Link href="/dashboard/admin/availability/graphical">Switch to graphical view</Link>
          </Button>
          <CreateAvailabilityDialog
            locations={locations}
            staff={staffUsers
              .map((s) => s.user)
              .filter(Boolean)
              .map((u) => ({
                id: u!.id,
                label: `${u!.firstName} ${u!.lastName}`.trim() || u!.email,
              }))}
          />
        </div>
      </div>

      <ResponsiveDataList
        desktop={
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead className="text-right">Window</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm">
                      No availability configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">
                        {locationName.get(r.locationId) ?? r.locationId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.staffId ? staffName.get(r.staffId) ?? r.staffId : 'All staff'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.isBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge>Open</Badge>}
                        <span className="ml-2 text-muted-foreground">
                          {r.specificDate
                            ? `Date: ${new Date(r.specificDate).toISOString().slice(0, 10)}`
                            : r.dayOfWeek !== null && r.dayOfWeek !== undefined
                              ? `Weekly: ${DOW[r.dayOfWeek] ?? r.dayOfWeek}`
                              : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.startTimeLocal && r.endTimeLocal
                          ? `${r.startTimeLocal}–${r.endTimeLocal}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <AvailabilityRowActions id={r.id} />
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
            {rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No availability configured yet.
              </div>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="space-y-3 p-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Location</div>
                      <div className="text-sm font-medium">
                        {locationName.get(r.locationId) ?? r.locationId}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Staff</div>
                      <div className="text-sm text-muted-foreground">
                        {r.staffId ? staffName.get(r.staffId) ?? r.staffId : 'All staff'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.isBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge>Open</Badge>}
                      <span className="text-sm text-muted-foreground">
                        {r.specificDate
                          ? `Date: ${new Date(r.specificDate).toISOString().slice(0, 10)}`
                          : r.dayOfWeek !== null && r.dayOfWeek !== undefined
                            ? `Weekly: ${DOW[r.dayOfWeek] ?? r.dayOfWeek}`
                            : '—'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Window</div>
                      <div className="text-sm text-muted-foreground">
                        {r.startTimeLocal && r.endTimeLocal
                          ? `${r.startTimeLocal}–${r.endTimeLocal}`
                          : '—'}
                      </div>
                    </div>
                    <AvailabilityRowActions id={r.id} />
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

