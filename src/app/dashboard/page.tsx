import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const roleTenantIds = (session.roles ?? []).map((r) => r.tenantId);
  const tenantIds = [...new Set([session.primaryTenantId, ...roleTenantIds])];
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds }, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const primaryTenant = tenantById.get(session.primaryTenantId);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{session.user?.email}</span>
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Primary tenant</div>
          <div className="mt-1 text-sm font-medium">
            {primaryTenant?.name ?? session.primaryTenantId}
          </div>
          {primaryTenant ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{primaryTenant.slug}</div>
          ) : null}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Tenant roles</div>
          <div className="mt-2 space-y-1 text-sm">
            {(session.roles ?? []).map((r) => {
              const t = tenantById.get(r.tenantId);
              return (
                <div key={`${r.tenantId}:${r.role}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium">{t?.name ?? r.tenantId}</span>
                  <span className="text-muted-foreground">{r.role}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Next</div>
          <div className="mt-1 text-sm">
            Build the dashboard shell, tenant switcher, and appointment views.
          </div>
        </div>
      </div>
    </div>
  );
}

