import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';

function hhmmToMinutes(s: string) {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export async function assertWithinAvailability(args: {
  tenantId: string;
  locationId: string;
  staffId?: string | null;
  startTimeUtc: Date;
  endTimeUtc: Date;
}) {
  const location = await prisma.location.findFirst({
    where: { id: args.locationId, tenantId: args.tenantId, deletedAt: null },
    select: { timeZone: true },
  });
  if (!location) throw new Error('Invalid location');

  const startLocal = toZonedTime(args.startTimeUtc, location.timeZone);
  const endLocal = toZonedTime(args.endTimeUtc, location.timeZone);
  if (startLocal > endLocal) throw new Error('Invalid time range');

  // Blocked overrides for that specific date
  const dateKey = new Date(
    Date.UTC(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate())
  );
  const blocked = await prisma.availability.findFirst({
    where: {
      tenantId: args.tenantId,
      locationId: args.locationId,
      staffId: args.staffId ?? undefined,
      specificDate: dateKey,
      isBlocked: true,
    },
    select: { id: true },
  });
  if (blocked) throw new Error('Unavailable (blocked date)');

  // Weekly windows
  const dow = startLocal.getDay(); // 0-6
  const windows = await prisma.availability.findMany({
    where: {
      tenantId: args.tenantId,
      locationId: args.locationId,
      staffId: args.staffId ?? undefined,
      dayOfWeek: dow,
      isBlocked: false,
    },
    select: { startTimeLocal: true, endTimeLocal: true },
  });
  if (windows.length === 0) throw new Error('No availability configured');

  const startMin = startLocal.getHours() * 60 + startLocal.getMinutes();
  const endMin = endLocal.getHours() * 60 + endLocal.getMinutes();
  const ok = windows.some((w) => {
    if (!w.startTimeLocal || !w.endTimeLocal) return false;
    const ws = hhmmToMinutes(w.startTimeLocal);
    const we = hhmmToMinutes(w.endTimeLocal);
    return startMin >= ws && endMin <= we;
  });
  if (!ok) throw new Error('Outside availability');
}

