import { PrismaClient, Role, AppointmentStatus, AuditActionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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

  const adminUser = await prisma.user.upsert({
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
  });

  const staffUser = await prisma.user.upsert({
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
  });

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
      staffId: staffUser.id,
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
        staffId: staffUser.id,
        typeId: appointmentType.id,
        startTime: start,
        endTime: end,
        status: AppointmentStatus.SCHEDULED,
        notes: 'Seed appointment',
      },
    }));

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
      staffId: staffUser.id,
      dayOfWeek: 1,
      startTimeLocal: '09:00',
      endTimeLocal: '17:00',
      isBlocked: false,
    },
  });

  if (!existingAvailability) {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

