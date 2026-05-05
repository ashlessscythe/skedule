import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

export default async function AdminHomePage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Next: locations, appointment types, availability, users, approvals, and branding.
        </p>
      </div>
    </div>
  );
}

