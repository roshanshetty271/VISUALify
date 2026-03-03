import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { StatsDashboard } from '@/components/dashboard';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="p-6">
        <StatsDashboard />
      </main>
    </div>
  );
}

