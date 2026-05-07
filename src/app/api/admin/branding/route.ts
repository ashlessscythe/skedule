import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const BrandingInputSchema = z.object({
  logoUrl: z.string().trim().min(1).nullable().optional(),
  primaryColor: z.string().trim().min(1).nullable().optional(),
  secondaryColor: z.string().trim().min(1).nullable().optional(),
  accentColor: z.string().trim().min(1).nullable().optional(),
  emailFromName: z.string().trim().min(1).nullable().optional(),
  emailFromAddress: z.string().trim().min(1).nullable().optional(),
});

function normalizeNullableString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const branding = await prisma.branding.findUnique({
    where: { tenantId: ctx.tenantId },
    select: {
      tenantId: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      emailFromName: true,
      emailFromAddress: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ branding });
}

export async function PUT(req: Request) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const json = await req.json();
  const parsed = BrandingInputSchema.parse({
    logoUrl: normalizeNullableString(json?.logoUrl),
    primaryColor: normalizeNullableString(json?.primaryColor),
    secondaryColor: normalizeNullableString(json?.secondaryColor),
    accentColor: normalizeNullableString(json?.accentColor),
    emailFromName: normalizeNullableString(json?.emailFromName),
    emailFromAddress: normalizeNullableString(json?.emailFromAddress),
  });

  const branding = await prisma.branding.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      logoUrl: parsed.logoUrl ?? null,
      primaryColor: parsed.primaryColor ?? null,
      secondaryColor: parsed.secondaryColor ?? null,
      accentColor: parsed.accentColor ?? null,
      emailFromName: parsed.emailFromName ?? null,
      emailFromAddress: parsed.emailFromAddress ?? null,
    },
    update: {
      ...(parsed.logoUrl !== undefined ? { logoUrl: parsed.logoUrl } : {}),
      ...(parsed.primaryColor !== undefined ? { primaryColor: parsed.primaryColor } : {}),
      ...(parsed.secondaryColor !== undefined ? { secondaryColor: parsed.secondaryColor } : {}),
      ...(parsed.accentColor !== undefined ? { accentColor: parsed.accentColor } : {}),
      ...(parsed.emailFromName !== undefined ? { emailFromName: parsed.emailFromName } : {}),
      ...(parsed.emailFromAddress !== undefined ? { emailFromAddress: parsed.emailFromAddress } : {}),
    },
    select: {
      tenantId: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      emailFromName: true,
      emailFromAddress: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ branding });
}

