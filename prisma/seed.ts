import { PrismaClient, Role, AppointmentStatus, AuditActionType } from '@prisma/client';
import { addDays, addHours, addMinutes, startOfDay } from 'date-fns';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Extra seed staff emails (cleared with `--clear` alongside default users). */
const EXTRA_STAFF_EMAILS = [
  'staff-seed-2@acmehealth.test',
  'staff-seed-3@acmehealth.test',
  'staff-seed-4@acmehealth.test',
] as const;

/** Approx. ±90 days around seed run date; idempotent via fixed `notes` keys. */
const REPORTING_WINDOW_DAYS = 90;
const REPORTING_APPOINTMENT_COUNT = 45;

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
          'Also creates 3 locations, 3 extra staff (password Admin123!), Mon–Fri availability,',
          'and reporting appointments spanning about ±90 days.',
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
    where: {
      email: {
        in: ['admin@acmehealth.test', 'staff@acmehealth.test', ...EXTRA_STAFF_EMAILS],
      },
    },
    select: { id: true, email: true },
  });
  for (const u of maybeUsers) {
    const memberships = await prisma.userTenant.count({ where: { userId: u.id } });
    if (memberships === 0) {
      await prisma.user.delete({ where: { id: u.id } });
    }
  }
}

async function ensureSeedLocations(tenantId: string) {
  const specs = [
    {
      name: 'Downtown Clinic',
      addressLine1: '123 Main St',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '12345',
      country: 'US',
      timeZone: 'America/New_York',
    },
    {
      name: 'Westside Medical Center',
      addressLine1: '400 Harbor Blvd',
      city: 'Pacifica',
      state: 'CA',
      postalCode: '94110',
      country: 'US',
      timeZone: 'America/Los_Angeles',
    },
    {
      name: 'Uptown Wellness Hub',
      addressLine1: '88 Lakeview Rd',
      city: 'Milwaukee',
      state: 'WI',
      postalCode: '53202',
      country: 'US',
      timeZone: 'America/Chicago',
    },
  ] as const;

  const locations = [];
  for (const spec of specs) {
    const loc =
      (await prisma.location.findFirst({
        where: { tenantId, name: spec.name },
      })) ??
      (await prisma.location.create({
        data: { tenantId, ...spec },
      }));
    locations.push(loc);
  }
  return locations;
}

const SEED_APPOINTMENT_TYPE_SPECS = [
  {
    name: 'Consultation',
    description: 'Initial 30-minute consult',
    durationMinutes: 30,
    color: '#0ea5e9',
  },
  {
    name: 'Follow-up',
    description: 'Short follow-up visit',
    durationMinutes: 20,
    color: '#22c55e',
  },
  {
    name: 'New patient intake',
    description: 'Forms, vitals, and first assessment',
    durationMinutes: 60,
    color: '#a855f7',
  },
  {
    name: 'Procedure',
    description: 'Minor in-office procedure',
    durationMinutes: 90,
    color: '#f97316',
  },
  {
    name: 'Quick check-in',
    description: 'Brief nurse or MA check-in',
    durationMinutes: 15,
    color: '#64748b',
  },
] as const;

async function ensureSeedAppointmentTypes(tenantId: string) {
  const types = [];
  for (const spec of SEED_APPOINTMENT_TYPE_SPECS) {
    const row =
      (await prisma.appointmentType.findFirst({
        where: { tenantId, name: spec.name },
      })) ??
      (await prisma.appointmentType.create({
        data: { tenantId, ...spec },
      }));
    types.push(row);
  }
  return types;
}

function reportingSlotTimes(i: number, total: number) {
  const dayOffset =
    total <= 1 ? 0 : Math.round(-REPORTING_WINDOW_DAYS + (i * (2 * REPORTING_WINDOW_DAYS)) / (total - 1));
  let t = startOfDay(addDays(new Date(), dayOffset));
  t = addHours(t, 9 + (i % 7));
  t = addMinutes(t, (i % 2) * 30);
  return t;
}

async function ensureAvailabilityWindow(args: {
  tenantId: string;
  locationId: string;
  staffId: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
}) {
  const existing = await prisma.availability.findFirst({
    where: {
      tenantId: args.tenantId,
      locationId: args.locationId,
      staffId: args.staffId,
      dayOfWeek: args.dayOfWeek,
      startTimeLocal: args.startTimeLocal,
      endTimeLocal: args.endTimeLocal,
      isBlocked: false,
    },
  });
  if (!existing) {
    await prisma.availability.create({
      data: {
        tenantId: args.tenantId,
        locationId: args.locationId,
        staffId: args.staffId,
        dayOfWeek: args.dayOfWeek,
        startTimeLocal: args.startTimeLocal,
        endTimeLocal: args.endTimeLocal,
        isBlocked: false,
      },
    });
  }
}

async function seedStaffWeeklyAvailability(params: {
  tenantId: string;
  locationsByName: { downtown: { id: string }; westside: { id: string }; uptown: { id: string } };
  staff: { id: string; email: string }[];
}) {
  const { downtown, westside, uptown } = params.locationsByName;

  const primaryLocationId = (email: string): string => {
    if (email === 'staff@acmehealth.test' || email === 'staff-seed-4@acmehealth.test') return downtown.id;
    if (email === 'staff-seed-2@acmehealth.test') return westside.id;
    if (email === 'staff-seed-3@acmehealth.test') return uptown.id;
    return downtown.id;
  };

  for (const member of params.staff) {
    const locId = primaryLocationId(member.email);
    for (const dayOfWeek of [1, 2, 3, 4, 5] as const) {
      await ensureAvailabilityWindow({
        tenantId: params.tenantId,
        locationId: locId,
        staffId: member.id,
        dayOfWeek,
        startTimeLocal: '09:00',
        endTimeLocal: '17:00',
      });
    }
  }

  const staffSeed2 = params.staff.find((s) => s.email === 'staff-seed-2@acmehealth.test');
  if (staffSeed2) {
    for (const dayOfWeek of [2, 4] as const) {
      await ensureAvailabilityWindow({
        tenantId: params.tenantId,
        locationId: downtown.id,
        staffId: staffSeed2.id,
        dayOfWeek,
        startTimeLocal: '09:30',
        endTimeLocal: '12:30',
      });
    }
  }

  const staffSeed4 = params.staff.find((s) => s.email === 'staff-seed-4@acmehealth.test');
  if (staffSeed4) {
    for (const dayOfWeek of [2, 4] as const) {
      await ensureAvailabilityWindow({
        tenantId: params.tenantId,
        locationId: westside.id,
        staffId: staffSeed4.id,
        dayOfWeek,
        startTimeLocal: '13:00',
        endTimeLocal: '17:00',
      });
    }
  }
}

async function seedReportingAppointments(params: {
  tenantId: string;
  locations: { id: string }[];
  appointmentTypes: { id: string; durationMinutes: number }[];
  staff: { id: string }[];
  adminUserId: string | undefined;
}) {
  const todayStart = startOfDay(new Date());

  for (let i = 0; i < REPORTING_APPOINTMENT_COUNT; i++) {
    const notes = `Seed reporting #${i}`;
    const startTime = reportingSlotTimes(i, REPORTING_APPOINTMENT_COUNT);
    const apptType =
      params.appointmentTypes[i % params.appointmentTypes.length] ??
      params.appointmentTypes[0]!;
    const durationMs = apptType.durationMinutes * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    const existingAppt = await prisma.appointment.findFirst({
      where: { tenantId: params.tenantId, deletedAt: null, notes },
    });

    const locationId = params.locations[i % params.locations.length]!.id;
    const staffId =
      params.staff.length === 0
        ? null
        : params.staff[i % params.staff.length]!.id;

    let client = await prisma.client.findFirst({
      where: {
        tenantId: params.tenantId,
        email: `reporting-client-${i}@acmehealth.test`,
      },
    });
    client ??= await prisma.client.create({
      data: {
        tenantId: params.tenantId,
        firstName: 'Reporting',
        lastName: `Client${i}`,
        email: `reporting-client-${i}@acmehealth.test`,
        metadata: { seed: true, seedKey: `reporting-client:${i}` },
      },
    });

    let appt = existingAppt;
    const apptDay = startOfDay(startTime);
    const status =
      apptDay < todayStart
        ? AppointmentStatus.COMPLETED
        : apptDay > todayStart
          ? AppointmentStatus.SCHEDULED
          : i % 4 === 0
            ? AppointmentStatus.COMPLETED
            : AppointmentStatus.SCHEDULED;

    const mixStatus =
      i % 17 === 0
        ? AppointmentStatus.CANCELLED
        : i % 23 === 0
          ? AppointmentStatus.NO_SHOW
          : status;

    if (!appt) {
      appt = await prisma.appointment.create({
        data: {
          tenantId: params.tenantId,
          locationId,
          clientId: client.id,
          staffId,
          typeId: apptType.id,
          startTime,
          endTime,
          status: mixStatus,
          notes,
        },
      });
    } else if (
      existingAppt &&
      (existingAppt.locationId !== locationId ||
        existingAppt.clientId !== client.id ||
        existingAppt.staffId !== staffId ||
        existingAppt.typeId !== apptType.id ||
        existingAppt.startTime.getTime() !== startTime.getTime() ||
        existingAppt.endTime.getTime() !== endTime.getTime() ||
        existingAppt.status !== mixStatus)
    ) {
      appt = await prisma.appointment.update({
        where: { id: existingAppt.id },
        data: {
          locationId,
          clientId: client.id,
          staffId,
          typeId: apptType.id,
          startTime,
          endTime,
          status: mixStatus,
        },
      });
    }

    if (params.adminUserId && appt) {
      const existingLog = await prisma.auditLog.findFirst({
        where: {
          tenantId: params.tenantId,
          action: AuditActionType.APPOINTMENT_CREATED,
          entityType: 'Appointment',
          entityId: appt.id,
        },
      });
      if (!existingLog) {
        await prisma.auditLog.create({
          data: {
            tenantId: params.tenantId,
            userId: params.adminUserId,
            action: AuditActionType.APPOINTMENT_CREATED,
            entityType: 'Appointment',
            entityId: appt.id,
            appointmentId: appt.id,
            clientId: client.id,
            metadata: { seed: true, seedKey: notes },
          },
        });
      }
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

  const locations = await ensureSeedLocations(tenant.id);
  const downtown = locations[0]!;
  const westside = locations[1]!;
  const uptown = locations[2]!;

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

  const extraStaffDefs = [
    { email: EXTRA_STAFF_EMAILS[0], firstName: 'Dana', lastName: 'Rivera' },
    { email: EXTRA_STAFF_EMAILS[1], firstName: 'Ellis', lastName: 'Park' },
    { email: EXTRA_STAFF_EMAILS[2], firstName: 'Frank', lastName: 'Moore' },
  ] as const;

  const extraStaffUsers = opts.createDefaultUser
    ? await Promise.all(
        extraStaffDefs.map((spec) =>
          prisma.user.upsert({
            where: { email: spec.email },
            update: {
              passwordHash,
              firstName: spec.firstName,
              lastName: spec.lastName,
              isActive: true,
            },
            create: {
              email: spec.email,
              passwordHash,
              firstName: spec.firstName,
              lastName: spec.lastName,
              isActive: true,
            },
          })
        )
      )
    : [];

  if (adminUser) {
    await prisma.userTenant.createMany({
      data: [{ userId: adminUser.id, tenantId: tenant.id, role: Role.ADMIN }],
      skipDuplicates: true,
    });
  }

  const staffMembershipRows: { userId: string; tenantId: string; role: Role }[] = [];

  if (staffUser) {
    staffMembershipRows.push({
      userId: staffUser.id,
      tenantId: tenant.id,
      role: Role.STAFF,
    });
  }
  for (const u of extraStaffUsers) {
    staffMembershipRows.push({
      userId: u.id,
      tenantId: tenant.id,
      role: Role.STAFF,
    });
  }
  if (staffMembershipRows.length > 0) {
    await prisma.userTenant.createMany({
      data: staffMembershipRows,
      skipDuplicates: true,
    });
  }

  const staffProviders: { id: string; email: string }[] = [];
  if (staffUser) staffProviders.push({ id: staffUser.id, email: staffUser.email });
  for (const u of extraStaffUsers) {
    staffProviders.push({ id: u.id, email: u.email });
  }

  const appointmentTypes = await ensureSeedAppointmentTypes(tenant.id);
  const appointmentType =
    appointmentTypes.find((t) => t.name === 'Consultation') ?? appointmentTypes[0]!;

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
      locationId: downtown.id,
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
        locationId: downtown.id,
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
    const existingBaselineLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: AuditActionType.APPOINTMENT_CREATED,
        entityType: 'Appointment',
        entityId: appointment.id,
      },
    });
    if (!existingBaselineLog) {
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

  if (staffProviders.length > 0) {
    await seedStaffWeeklyAvailability({
      tenantId: tenant.id,
      locationsByName: { downtown, westside, uptown },
      staff: staffProviders,
    });
  }

  await seedReportingAppointments({
    tenantId: tenant.id,
    locations,
    appointmentTypes: appointmentTypes.map((t) => ({
      id: t.id,
      durationMinutes: t.durationMinutes,
    })),
    staff: staffProviders.map(({ id }) => ({ id })),
    adminUserId: adminUser?.id,
  });

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

      const status =
        idx % 6 === 0
          ? AppointmentStatus.CANCELLED
          : idx % 5 === 0
            ? AppointmentStatus.COMPLETED
            : AppointmentStatus.SCHEDULED;

      const locIdForCount = locations[idx % locations.length]!.id;
      const typeForIdx =
        appointmentTypes[idx % appointmentTypes.length] ?? appointmentType;
      const e = new Date(s.getTime() + typeForIdx.durationMinutes * 60 * 1000);

      const existingAppt = await prisma.appointment.findFirst({
        where: {
          tenantId: tenant.id,
          locationId: locIdForCount,
          clientId: extraClient.id,
          staffId: staffUser?.id ?? null,
          typeId: typeForIdx.id,
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
            locationId: locIdForCount,
            clientId: extraClient.id,
            staffId: staffUser?.id ?? null,
            typeId: typeForIdx.id,
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

