import { PrismaClient, Role, AppointmentStatus, AuditActionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SeedOptions = {
  useFaker: boolean;
  createDefaultUser: boolean;
  count: number;
  clear: boolean;
};

function parseArgs(argv: string[]): SeedOptions {
  const opts: SeedOptions = {
    useFaker: false,
    createDefaultUser: true,
    count: 1,
    clear: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--use-faker') opts.useFaker = true;
    else if (a === '--create-default-user') opts.createDefaultUser = true;
    else if (a.startsWith('--count=')) {
      const v = Number(a.slice('--count='.length));
      if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid --count: ${a}`);
      opts.count = Math.floor(v);
    } else if (a === '--count') {
      const v = Number(argv[i + 1]);
      if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid --count: ${argv[i + 1] ?? ''}`);
      opts.count = Math.floor(v);
      i++;
    } else if (a === '--clear') opts.clear = true;
    else if (a === '--help' || a === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: prisma db seed -- [options]',
          '',
          'Options:',
          '  --use-faker             Generate more realistic names/emails',
          '  --create-default-user   Create default admin + staff users (default: true)',
          '  --count <n>             Create <n> clients + appointments (default: 1)',
          '  --clear                 Clear existing seed tenant data first',
          '',
          'Examples:',
          '  npx prisma db seed -- --clear --count 25 --use-faker',
          '  npx prisma db seed -- --count=5',
        ].join('\n')
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  return opts;
}

async function clearSeedTenantData() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'acme-health' } });
  if (!tenant) return;

  // Delete in FK-safe order (scoped to this tenant).
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.qrToken.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.intakeToken.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.appointment.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.availability.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.recurrenceRule.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.client.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.appointmentType.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.branding.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.location.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.userTenant.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.tenant.deleteMany({ where: { id: tenant.id } }),
  ]);

  // Clean up seed users if they no longer belong to any tenant.
  const maybeUsers = await prisma.user.findMany({
    where: { email: { in: ['admin@acmehealth.test', 'staff@acmehealth.test'] } },
    select: { id: true, email: true },
  });
  for (const u of maybeUsers) {
    const memberships = await prisma.userTenant.count({ where: { userId: u.id } });
    if (memberships === 0) {
      await prisma.user.delete({ where: { id: u.id } });
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.clear) {
    await clearSeedTenantData();
  }

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-health' },
    update: {},
    create: {
      name: 'Acme Health Clinic',
      slug: 'acme-health',
    },
  });

  const location =
    (await prisma.location.findFirst({
      where: { tenantId: tenant.id, name: 'Downtown Clinic' },
    })) ??
    (await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: 'Downtown Clinic',
        addressLine1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '12345',
        country: 'US',
        timeZone: 'America/New_York',
      },
    }));

  const adminUser = opts.createDefaultUser
    ? await prisma.user.upsert({
        where: { email: 'admin@acmehealth.test' },
        update: {
          passwordHash,
          firstName: 'Alice',
          lastName: 'Admin',
          isActive: true,
        },
        create: {
          email: 'admin@acmehealth.test',
          passwordHash,
          firstName: 'Alice',
          lastName: 'Admin',
          isActive: true,
        },
      })
    : null;

  const staffUser = opts.createDefaultUser
    ? await prisma.user.upsert({
        where: { email: 'staff@acmehealth.test' },
        update: {
          passwordHash,
          firstName: 'Bob',
          lastName: 'Staff',
          isActive: true,
        },
        create: {
          email: 'staff@acmehealth.test',
          passwordHash,
          firstName: 'Bob',
          lastName: 'Staff',
          isActive: true,
        },
      })
    : null;

  if (adminUser && staffUser) {
    await prisma.userTenant.createMany({
      data: [
        {
          userId: adminUser.id,
          tenantId: tenant.id,
          role: Role.ADMIN,
        },
        {
          userId: staffUser.id,
          tenantId: tenant.id,
          role: Role.STAFF,
        },
      ],
      skipDuplicates: true,
    });
  }

  const appointmentType =
    (await prisma.appointmentType.findFirst({
      where: { tenantId: tenant.id, name: 'Consultation' },
    })) ??
    (await prisma.appointmentType.create({
      data: {
        tenantId: tenant.id,
        name: 'Consultation',
        description: 'Initial 30-minute consult',
        durationMinutes: 30,
        color: '#0ea5e9',
      },
    }));

  const client =
    (await prisma.client.findFirst({
      where: { tenantId: tenant.id, email: 'client@example.com' },
    })) ??
    (await prisma.client.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Charlie',
        lastName: 'Client',
        email: 'client@example.com',
        metadata: {
          notes: 'Seed client',
        },
      },
    }));

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      locationId: location.id,
      clientId: client.id,
      staffId: staffUser?.id ?? null,
      typeId: appointmentType.id,
      startTime: start,
      endTime: end,
      deletedAt: null,
    },
  });

  const appointment =
    existingAppointment ??
    (await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        clientId: client.id,
        staffId: staffUser?.id ?? null,
        typeId: appointmentType.id,
        startTime: start,
        endTime: end,
        status: AppointmentStatus.SCHEDULED,
        notes: 'Seed appointment',
      },
    }));

  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: AuditActionType.APPOINTMENT_CREATED,
        entityType: 'Appointment',
        entityId: appointment.id,
        appointmentId: appointment.id,
        clientId: client.id,
        metadata: { seed: true },
      },
    });
  }

  // Basic branding
  await prisma.branding.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      logoUrl: null,
      primaryColor: '#0f766e',
      secondaryColor: '#0ea5e9',
      accentColor: '#f97316',
      emailFromName: null,
      emailFromAddress: null,
    },
  });

  // Simple availability
  const existingAvailability = await prisma.availability.findFirst({
    where: {
      tenantId: tenant.id,
      locationId: location.id,
      staffId: staffUser?.id ?? null,
      dayOfWeek: 1,
      startTimeLocal: '09:00',
      endTimeLocal: '17:00',
      isBlocked: false,
    },
  });

  if (!existingAvailability && staffUser) {
    await prisma.availability.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        staffId: staffUser.id,
        dayOfWeek: 1,
        startTimeLocal: '09:00',
        endTimeLocal: '17:00',
        isBlocked: false,
      },
    });
  }

  // Additional sample data (beyond the baseline records above)
  if (opts.count > 0) {
    let faker: any | undefined;

    if (opts.useFaker) {
      // Lazy import so seed still works without faker unless requested.
      const mod = await import('@faker-js/faker');
      faker = mod.faker;
    }

    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let idx = 0; idx < opts.count; idx++) {
      // Idempotency: use deterministic faker output + stable unique-ish identifiers.
      // (Client.email isn't unique in schema, so we use (tenantId,email) as our natural key.)
      if (faker) faker.seed(10_000 + idx);

      const firstName = faker ? faker.person.firstName() : `Client${idx + 1}`;
      const lastName = faker ? faker.person.lastName() : 'Seed';
      const email = `seed-client-${idx + 1}@acmehealth.test`;
      const phone = faker ? faker.phone.number() : undefined;
      const dob = faker ? faker.date.birthdate({ min: 18, max: 80, mode: 'age' }) : undefined;

      const existingClient = await prisma.client.findFirst({
        where: { tenantId: tenant.id, email },
      });

      const extraClient =
        existingClient ??
        (await prisma.client.create({
          data: {
            tenantId: tenant.id,
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth: dob,
            metadata: { seed: true, seedKey: `client:${idx + 1}` },
          },
        }));

      // Deterministic time slots per idx so we can "find-or-create" appointments.
      const dayOffset = (idx % 14) + 1;
      const hour = 9 + (idx % 8); // 9..16
      const minute = (idx % 2) * 30;

      const s = new Date(base);
      s.setDate(base.getDate() + dayOffset);
      s.setHours(hour, minute, 0, 0);
      const e = new Date(s.getTime() + appointmentType.durationMinutes * 60 * 1000);

      const status =
        idx % 6 === 0
          ? AppointmentStatus.CANCELLED
          : idx % 5 === 0
            ? AppointmentStatus.COMPLETED
            : AppointmentStatus.SCHEDULED;

      const existingAppt = await prisma.appointment.findFirst({
        where: {
          tenantId: tenant.id,
          locationId: location.id,
          clientId: extraClient.id,
          staffId: staffUser?.id ?? null,
          typeId: appointmentType.id,
          startTime: s,
          endTime: e,
          deletedAt: null,
        },
      });

      const extraAppt =
        existingAppt ??
        (await prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            locationId: location.id,
            clientId: extraClient.id,
            staffId: staffUser?.id ?? null,
            typeId: appointmentType.id,
            startTime: s,
            endTime: e,
            status,
            notes: 'Seed appointment',
          },
        }));

      // Only create the audit log once per appointment.
      if (adminUser) {
        const existingLog = await prisma.auditLog.findFirst({
          where: {
            tenantId: tenant.id,
            action: AuditActionType.APPOINTMENT_CREATED,
            entityType: 'Appointment',
            entityId: extraAppt.id,
          },
        });

        if (!existingLog) {
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: adminUser.id,
              action: AuditActionType.APPOINTMENT_CREATED,
              entityType: 'Appointment',
              entityId: extraAppt.id,
              appointmentId: extraAppt.id,
              clientId: extraClient.id,
              metadata: { seed: true, seedKey: `appt:${idx + 1}` },
            },
          });
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

