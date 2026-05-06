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

export default async function AdminLocationsPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const locations = await prisma.location.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Configure locations and timezones for scheduling.
          </p>
        </div>
        <CreateLocationDialog />
      </div>

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
    </div>
  );
}

