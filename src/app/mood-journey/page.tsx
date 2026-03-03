import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { MoodJourney } from '@/components/mood';

export default async function MoodJourneyPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="p-6">
        <MoodJourney />
      </main>
    </div>
  );
}

