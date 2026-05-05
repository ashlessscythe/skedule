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
          include: {
            tenants: {
              select: { tenantId: true, role: true },
            },
          },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const roles: SessionRoleAssignment[] = user.tenants.map((t) => ({
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
      }
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId ?? '';
      session.roles = (token.roles ?? []) as SessionRoleAssignment[];
      session.primaryTenantId = token.primaryTenantId ?? '';
      return session;
    },
  },
};

