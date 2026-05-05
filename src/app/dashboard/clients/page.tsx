import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { CreateClientDialog } from './ui/create-client-dialog';
import { IntakeLinkButton } from './ui/intake-link-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ClientsPage() {
  const ctx = await getTenantContext();

  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Create clients and generate intake links.
          </p>
        </div>
        <CreateClientDialog />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  No clients yet.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <IntakeLinkButton clientId={c.id} />
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

