import type { CSSProperties, ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const roleForTenant = session.roles.find((r) => r.tenantId === session.primaryTenantId)?.role;
  const isAdmin = roleForTenant === 'ADMIN';

  const activeTenant = await prisma.tenant.findUnique({
    where: { id: session.primaryTenantId },
    select: {
      name: true,
      branding: { select: { logoUrl: true, primaryColor: true } },
    },
  });
  const tenantLogoUrl = activeTenant?.branding?.logoUrl?.trim() || null;
  const tenantPrimary = activeTenant?.branding?.primaryColor?.trim() || null;

  return (
    <div
      className="relative min-h-full bg-background"
      style={
        tenantPrimary
          ? ({
              ['--tenant-primary']: tenantPrimary,
            } as unknown as CSSProperties)
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-purple-500/10 to-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-primary/10 to-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.foreground/0.05),transparent_55%)]" />
      </div>

      <header className="border-b border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-4">
          {tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantLogoUrl}
              alt={activeTenant?.name ? `${activeTenant.name} logo` : 'Tenant logo'}
              className="h-7 w-7 rounded object-contain"
            />
          ) : (
            <div className="h-7 w-7 rounded bg-muted" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {activeTenant?.name ?? 'Dashboard'}
            </div>
            <div className="text-xs text-muted-foreground">Active tenant</div>
          </div>

          <div className="ml-auto h-2 w-28 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full w-full', tenantPrimary ? 'bg-[var(--tenant-primary)]' : 'bg-primary')}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50">
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
                  href="/dashboard/admin/audit"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Audit log
                </Link>
                <Link
                  href="/dashboard/admin/staff"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Staff
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
                <Link
                  href="/dashboard/admin/branding"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start'
                  )}
                >
                  Branding
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

