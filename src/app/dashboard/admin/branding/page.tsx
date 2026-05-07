import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { BrandingForm } from './ui/branding-form';

export default async function AdminBrandingPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const branding = await prisma.branding.findUnique({
    where: { tenantId: ctx.tenantId },
    select: {
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      emailFromName: true,
      emailFromAddress: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-sm text-muted-foreground">
          Configure light white-label details for the active tenant.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <BrandingForm initialBranding={branding} />
      </div>
    </div>
  );
}

