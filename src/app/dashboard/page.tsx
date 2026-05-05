import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

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
          <div className="mt-1 text-sm font-medium">{session.primaryTenantId}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Tenant roles</div>
          <div className="mt-2 space-y-1 text-sm">
            {(session.roles ?? []).map((r) => (
              <div key={`${r.tenantId}:${r.role}`} className="flex gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {r.tenantId}
                </span>
                <span className="font-medium">{r.role}</span>
              </div>
            ))}
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

