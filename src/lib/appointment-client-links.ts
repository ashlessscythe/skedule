export type LocationAddressFields = {
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export function formatLocationAddress(location: LocationAddressFields): string | null {
  const line1 = location.addressLine1?.trim();
  const line2 = location.addressLine2?.trim();
  const cityLine = [location.city?.trim(), location.state?.trim(), location.postalCode?.trim()]
    .filter(Boolean)
    .join(', ');
  const country = location.country?.trim();

  const parts = [
    line1,
    line2,
    cityLine || null,
    country || null,
  ].filter((p): p is string => Boolean(p));

  if (parts.length === 0) return null;
  return parts.join(', ');
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsUrlForLocation(location: LocationAddressFields): string | null {
  const formatted = formatLocationAddress(location);
  const query = formatted ?? location.name.trim();
  if (!query) return null;
  return googleMapsSearchUrl(query);
}

/** Google Calendar “create event” deep link (UTC instants). */
export function googleCalendarAddUrl(args: {
  title: string;
  startUtc: Date;
  endUtc: Date;
  location?: string | null;
  details?: string | null;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: args.title,
    dates: `${fmt(args.startUtc)}/${fmt(args.endUtc)}`,
  });
  if (args.location?.trim()) params.set('location', args.location.trim());
  if (args.details?.trim()) params.set('details', args.details.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcsCalendarFile(args: {
  uid: string;
  title: string;
  startUtc: Date;
  endUtc: Date;
  location?: string | null;
  description?: string | null;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(args.uid)}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(args.startUtc)}`,
    `DTEND:${toIcsUtc(args.endUtc)}`,
    `SUMMARY:${escapeIcsText(args.title)}`,
  ];
  if (args.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(args.location.trim())}`);
  }
  if (args.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(args.description.trim())}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function icsDownloadFilename(args: { startUtc: Date; title: string }): string {
  const day = args.startUtc.toISOString().slice(0, 10);
  const slug = args.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `appointment-${day}${slug ? `-${slug}` : ''}.ics`;
}
