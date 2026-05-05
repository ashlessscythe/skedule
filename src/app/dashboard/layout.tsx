import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const roleForTenant = session.roles.find((r) => r.tenantId === session.primaryTenantId)?.role;
  const isAdmin = roleForTenant === 'ADMIN';

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border bg-card p-3">
          <div className="px-3 py-2 text-sm font-semibold tracking-tight">Dashboard</div>
          <nav className="mt-1 flex flex-col gap-1">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
            >
              Overview
            </Link>
            <Link
              href="/dashboard/appointments"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
            >
              Appointments
            </Link>
            <Link
              href="/dashboard/clients"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
            >
              Clients
            </Link>
            <Link
              href="/dashboard/reporting"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
            >
              Reporting
            </Link>

            {isAdmin ? (
              <>
                <div className="mt-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Admin
                </div>
                <Link
                  href="/dashboard/admin"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Admin home
                </Link>
                <Link
                  href="/dashboard/admin/locations"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Locations
                </Link>
                <Link
                  href="/dashboard/admin/appointment-types"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Appointment types
                </Link>
                <Link
                  href="/dashboard/admin/availability"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Availability
                </Link>
              </>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

