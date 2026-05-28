import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    userId: string;
    primaryTenantId: string;
    roles: { tenantId: string; role: 'ADMIN' | 'STAFF' }[];
    error?: 'SessionExpired';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    primaryTenantId?: string;
    roles?: { tenantId: string; role: 'ADMIN' | 'STAFF' }[];
    sessionVersion?: number;
  }
}

