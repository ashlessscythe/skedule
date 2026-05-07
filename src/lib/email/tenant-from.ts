import { prisma } from '@/lib/prisma';

export async function getTenantEmailFrom(tenantId: string): Promise<string | null> {
  const branding = await prisma.branding.findUnique({
    where: { tenantId },
    select: { emailFromName: true, emailFromAddress: true },
  });

  const address = branding?.emailFromAddress?.trim() || null;
  if (!address) return null;

  const name = branding?.emailFromName?.trim() || null;
  return name ? `${name} <${address}>` : address;
}

