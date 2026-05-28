export const CHECKIN_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CheckinWindowState = 'too_early' | 'open' | 'closed';

export function checkinOpensAt(startTime: Date): Date {
  return new Date(startTime.getTime() - CHECKIN_WINDOW_MS);
}

export function getCheckinWindowState(args: {
  startTime: Date;
  endTime: Date;
  now?: Date;
}): CheckinWindowState {
  const now = args.now ?? new Date();
  if (now.getTime() < checkinOpensAt(args.startTime).getTime()) return 'too_early';
  if (now.getTime() > args.endTime.getTime()) return 'closed';
  return 'open';
}
