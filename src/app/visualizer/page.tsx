import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { VisualizerContainer } from '@/components/visualizer';

export default async function VisualizerPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/');
  }

  return <VisualizerContainer />;
}

