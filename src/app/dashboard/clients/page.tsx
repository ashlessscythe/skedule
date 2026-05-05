import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Next: client list, create/edit, and intake link sending.
        </p>
      </div>
    </div>
  );
}

