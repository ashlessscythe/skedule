import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import {
  ACTIVE_TENANT_COOKIE,
  canAccessTenant,
  getActiveTenantIdFromCookie,
} from '@/lib/security/rbac-mw';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const cookieTenantId = getActiveTenantIdFromCookie(
    cookieStore.get(ACTIVE_TENANT_COOKIE)?.value
  );
  const activeTenantId =
    cookieTenantId && canAccessTenant(token, cookieTenantId)
      ? cookieTenantId
      : token.primaryTenantId ?? null;

  const tenantIds = (token.roles ?? []).map((r) => r.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds }, deletedAt: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ activeTenantId, tenants });
}

