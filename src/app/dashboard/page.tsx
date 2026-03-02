import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { StatsDashboard } from '@/components/dashboard';
import { LogoutButton } from '@/components/auth';

/**
 * Stats Dashboard Page
 * 
 * Displays listening analytics with D3 charts.
 * Requires authentication.
 */
export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">
            <span className="text-white">VISUAL</span>
            <span className="text-[#1DB954]">ify</span>
          </h1>
          <LogoutButton />
        </div>
      </header>

      {/* Dashboard */}
      <main className="p-6">
        <StatsDashboard />
      </main>
    </div>
  );
}

