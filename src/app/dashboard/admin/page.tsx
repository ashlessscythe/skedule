import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default async function AdminHomePage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Configure the active tenant.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/dashboard/admin/locations" className={buttonVariants({ variant: 'outline' })}>
          Locations
        </Link>
        <Link href="/dashboard/admin/staff" className={buttonVariants({ variant: 'outline' })}>
          Staff
        </Link>
        <Link href="/dashboard/admin/branding" className={buttonVariants({ variant: 'outline' })}>
          Branding
        </Link>
        <Link
          href="/dashboard/admin/appointment-types"
          className={buttonVariants({ variant: 'outline' })}
        >
          Appointment types
        </Link>
        <Link
          href="/dashboard/admin/availability"
          className={buttonVariants({ variant: 'outline' })}
        >
          Availability
        </Link>
      </div>
    </div>
  );
}

