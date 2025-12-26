import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { VisualizerContainer } from '@/components/visualizer';
import { LogoutButton } from '@/components/auth';

export default async function VisualizerPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pointer-events-none">
        <h1 className="text-xl font-display font-bold pointer-events-auto">
          <span className="text-white">VISUAL</span>
          <span className="text-[var(--theme-primary)]">ify</span>
        </h1>
        <div className="pointer-events-auto">
          <LogoutButton />
        </div>
      </header>

      {/* Visualizer */}
      <VisualizerContainer />
    </div>
  );
}

