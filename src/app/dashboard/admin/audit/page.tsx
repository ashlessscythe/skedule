import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { listAuditLogsForTenant } from '@/lib/audit-query';

function parseDateInputToUtcStart(dateStr: string | undefined) {
  if (!dateStr) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
  return Number.isFinite(dt.getTime()) ? dt : undefined;
}

function parseDateInputToUtcEnd(dateStr: string | undefined) {
  if (!dateStr) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
  return Number.isFinite(dt.getTime()) ? dt : undefined;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const startRaw = typeof searchParams?.start === 'string' ? searchParams.start : undefined;
  const endRaw = typeof searchParams?.end === 'string' ? searchParams.end : undefined;
  const entityType = typeof searchParams?.entityType === 'string' ? searchParams.entityType.trim() : '';
  const userId = typeof searchParams?.userId === 'string' ? searchParams.userId.trim() : '';

  const startDate = parseDateInputToUtcStart(startRaw);
  const endDate = parseDateInputToUtcEnd(endRaw);

  const [entityTypesDistinct, users, logs] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenantId: ctx.tenantId },
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { tenants: { some: { tenantId: ctx.tenantId, status: 'ACTIVE' } } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    listAuditLogsForTenant({
      tenantId: ctx.tenantId,
      startDate,
      endDate,
      entityType: entityType || undefined,
      userId: userId || undefined,
    }),
  ]);

  const entityTypes = entityTypesDistinct
    .map((e) => e.entityType)
    .filter((v): v is string => Boolean(v && v.trim()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Audit Log</h1>
        <p className="text-sm text-muted-foreground">Recent audit events for the active tenant.</p>
      </div>

      <form className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Start date</div>
            <input
              name="start"
              type="date"
              defaultValue={startRaw}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">End date</div>
            <input
              name="end"
              type="date"
              defaultValue={endRaw}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Entity type</div>
            <select
              name="entityType"
              defaultValue={entityType}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">User</div>
            <select
              name="userId"
              defaultValue={userId}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All</option>
              {users.map((u) => {
                const name = `${u.firstName} ${u.lastName}`.trim();
                return (
                  <option key={u.id} value={u.id}>
                    {name || u.email}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Dates are interpreted as UTC day boundaries. Showing up to 100 entries.
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">Recent events</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="h-10 px-3 text-left font-medium">When (UTC)</th>
                <th className="h-10 px-3 text-left font-medium">Action</th>
                <th className="h-10 px-3 text-left font-medium">Entity</th>
                <th className="h-10 px-3 text-left font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((l) => {
                  const when = l.createdAt.toISOString().replace('T', ' ').replace('Z', 'Z');
                  const userLabel = l.user
                    ? `${l.user.firstName} ${l.user.lastName}`.trim() || l.user.email
                    : 'System';
                  return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{when}</td>
                      <td className="px-3 py-2">{l.action}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{l.entityType}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.entityId}</div>
                      </td>
                      <td className="px-3 py-2">{userLabel}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={4}>
                    No audit entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

