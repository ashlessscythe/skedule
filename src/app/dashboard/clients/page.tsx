import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { CreateClientDialog } from './ui/create-client-dialog';
import { DatabaseUnavailableCard } from '@/components/db-unavailable';
import { ClientsList, type ClientRow } from './ui/clients-list';

export default async function ClientsPage() {
  let clients: ClientRow[] = [];
  try {
    const ctx = await getTenantContext();
    const rows = await prisma.client.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
    });

    const now = new Date();
    const counts = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        startTime: { gte: now },
      },
      _count: { _all: true },
      orderBy: { clientId: 'asc' },
    });
    const byClientId = new Map(counts.map((c) => [c.clientId, c._count._all]));

    clients = rows.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      upcomingCount: byClientId.get(c.id) ?? 0,
    }));
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Create clients and generate intake links.
          </p>
        </div>
        <CreateClientDialog />
      </div>

      <ClientsList rows={clients} />
    </div>
  );
}

