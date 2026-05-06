import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { CreateClientDialog } from './ui/create-client-dialog';
import { IntakeLinkButton } from './ui/intake-link-button';
import { ClientRowActions } from './ui/client-row-actions';
import { DatabaseUnavailableCard } from '@/components/db-unavailable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ClientsPage() {
  let clients: Awaited<ReturnType<typeof prisma.client.findMany>> = [];
  try {
    const ctx = await getTenantContext();
    clients = await prisma.client.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Create clients and generate intake links.</p>
        </div>
        <DatabaseUnavailableCard title="Unable to load clients" detail={msg} />
      </div>
    );
  }

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
                    <div className="inline-flex items-center justify-end gap-2">
                      <IntakeLinkButton clientId={c.id} />
                      <ClientRowActions client={c} />
                    </div>
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

