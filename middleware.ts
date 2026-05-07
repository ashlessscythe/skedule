import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ACTIVE_TENANT_COOKIE,
  getActiveTenantIdFromCookie,
  isAdminForPrimaryTenant,
  isAdminForTenant,
} from './src/lib/security/rbac-mw';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Cloudflare Turnstile uses an iframe with `srcdoc` containing inline script.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
].join('; ');

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

  const res = NextResponse.next();
  // Ensure Turnstile can run in dev/prod even if another layer injects a strict CSP.
  res.headers.set('Content-Security-Policy', CSP);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/:path*'],
};

