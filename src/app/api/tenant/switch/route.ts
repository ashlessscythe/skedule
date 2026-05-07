import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import {
  ACTIVE_TENANT_COOKIE,
  canAccessTenant,
} from '@/lib/security/rbac-mw';

const SwitchSchema = z.object({
  tenantId: z.string().min(1).nullable(),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const input = SwitchSchema.parse(json);

  if (!input.tenantId) {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_TENANT_COOKIE);
    return NextResponse.json({ ok: true, activeTenantId: token.primaryTenantId ?? null });
  }

  if (!canAccessTenant(token, input.tenantId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, input.tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/dashboard',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, activeTenantId: input.tenantId });
}

