import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { CreateLocationDialog } from './ui/create-location-dialog';
import { LocationRowActions } from './ui/location-row-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveDataList } from '@/components/responsive-data-list';

export default async function AdminLocationsPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const locations = await prisma.location.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Configure locations and timezones for scheduling.
          </p>
        </div>
        <CreateLocationDialog />
      </div>

      <ResponsiveDataList
        desktop={
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm">
                      No locations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium">{l.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.timeZone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[l.addressLine1, l.city, l.state, l.postalCode]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <LocationRowActions location={l} />
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
            {locations.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No locations yet.
              </div>
            ) : (
              <ul className="divide-y">
                {locations.map((l) => (
                  <li key={l.id} className="space-y-3 p-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Name</div>
                      <div className="text-sm font-medium">{l.name}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Timezone</div>
                      <div className="break-words text-sm text-muted-foreground">{l.timeZone}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Address</div>
                      <div className="text-sm text-muted-foreground">
                        {[l.addressLine1, l.city, l.state, l.postalCode]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <LocationRowActions location={l} />
                    </div>
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

