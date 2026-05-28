import { getTenantContext } from '@/lib/tenant-context';
import { AdminOverview } from './overview/admin-overview';
import { loadOverviewData } from './overview/load-overview-data';
import { StaffOverview } from './overview/staff-overview';

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const data = await loadOverviewData(ctx);

  if (data.role === 'ADMIN') {
    return <AdminOverview data={data} />;
  }

  return <StaffOverview data={data} />;
}
