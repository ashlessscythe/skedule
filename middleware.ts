import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ACTIVE_TENANT_COOKIE,
  getActiveTenantIdFromCookie,
  isAdminForPrimaryTenant,
  isAdminForTenant,
} from './src/lib/security/rbac-mw';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/dashboard/admin')) {
      const activeTenantId = getActiveTenantIdFromCookie(
        req.cookies.get(ACTIVE_TENANT_COOKIE)?.value
      );
      const ok =
        (activeTenantId ? isAdminForTenant(token, activeTenantId) : false) ||
        isAdminForPrimaryTenant(token);
      if (!ok) {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

