/** Monday 00:00:00.000 UTC through Sunday 23:59:59.999 UTC for the week containing `ref`. */
export function getUtcWeekRange(ref: Date): { start: Date; end: Date } {
  const d = new Date(ref);
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday, 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + 6,
      23,
      59,
      59,
      999
    )
  );
  return { start, end };
}
