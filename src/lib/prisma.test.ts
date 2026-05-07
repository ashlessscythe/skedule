import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  class PrismaClient {
    constructor() {}
  }
  return { PrismaClient };
});

describe('prisma singleton', () => {
  beforeEach(() => {
    vi.resetModules();
    // ensure global cache is cleared between imports
    const g = globalThis as typeof globalThis & { prisma?: unknown };
    g.prisma = undefined;
  });

  it('reuses global prisma instance in non-production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const m1 = await import('./prisma');
    const p1 = m1.prisma;
    const m2 = await import('./prisma');
    const p2 = m2.prisma;

    expect(p2).toBe(p1);

    process.env.NODE_ENV = prev;
  });
});

