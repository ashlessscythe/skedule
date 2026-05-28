import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export type SessionRoleAssignment = {
  tenantId: string;
  role: 'ADMIN' | 'STAFF';
};

type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: SessionRoleAssignment[];
  primaryTenantId: string;
  sessionVersion: number;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            isActive: true,
            sessionVersion: true,
            tenants: {
              select: { tenantId: true, role: true, status: true },
            },
          },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const roles: SessionRoleAssignment[] = user.tenants
          .filter((t) => t.status === 'ACTIVE')
          .map((t) => ({
            tenantId: t.tenantId,
            role: t.role,
          }));
        if (roles.length === 0) return null;

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          roles,
          primaryTenantId: roles[0]!.tenantId,
          sessionVersion: user.sessionVersion,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AuthUser;
        token.userId = u.id;
        token.roles = u.roles;
        token.primaryTenantId = u.primaryTenantId;
        token.sessionVersion = u.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.userId) {
        session.error = 'SessionExpired';
        return session;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.userId },
        select: { sessionVersion: true, isActive: true, email: true },
      });

      if (
        !dbUser?.isActive ||
        dbUser.sessionVersion !== (token.sessionVersion as number | undefined)
      ) {
        session.error = 'SessionExpired';
        return session;
      }

      session.userId = token.userId;
      session.roles = (token.roles ?? []) as SessionRoleAssignment[];
      session.primaryTenantId = token.primaryTenantId ?? '';
      if (session.user) {
        session.user.email = dbUser.email;
      }
      return session;
    },
  },
};

