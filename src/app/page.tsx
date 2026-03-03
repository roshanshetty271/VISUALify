'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { LoginButton } from '@/components/auth';

const MODES = [
  { name: 'Pulse', desc: 'Beat-reactive rings that explode from the center', color: '#1DB954' },
  { name: 'Orbit', desc: 'Tracks orbit a pulsing sun in deep space', color: '#3B82F6' },
  { name: 'Particles', desc: 'Swarm of points that scatter on every beat', color: '#8B5CF6' },
];

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: 'Spotify login didn\'t complete. This sometimes happens on the first try — click below to try again.',
  OAuthSignin: 'Couldn\'t start Spotify login. Please try again.',
  OAuthAccountNotLinked: 'This Spotify account is already linked to another login.',
  Callback: 'Something went wrong during login. Please try again.',
  Default: 'Login failed. Please try again.',
};

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace('/visualizer');
      return;
    }

    const error = searchParams.get('error');
    if (error) {
      setAuthError(ERROR_MESSAGES[error] || ERROR_MESSAGES.Default);
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, session, router]);

  return (
    <main className="min-h-screen bg-white text-zinc-900 selection:bg-[#1DB954]/20">
      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,185,84,0.12) 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,185,84,0.09) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h1 className="text-[clamp(4.5rem,12vw,9rem)] font-bold tracking-tight leading-[0.9] mb-8">
            VISUAL<span className="text-[#1DB954]">ify</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 font-light leading-relaxed mb-10">
            Real-time visualizations that react to
            <br className="hidden md:block" />
            {' '}your Spotify playback.
          </p>

          {authError && (
            <div className="mb-6 mx-auto max-w-md bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left">
                <p className="text-sm text-red-700">{authError}</p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="ml-auto text-red-400 hover:text-red-600 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <LoginButton />
            <span className="text-[11px] text-zinc-400 tracking-wide">
              Free &middot; Requires Spotify
            </span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-300">
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <div className="w-px h-6 bg-zinc-200" />
        </div>
      </section>

      {/* Modes */}
      <section className="py-28 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-zinc-400 uppercase tracking-[0.2em] mb-16">
            Three visualization modes
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-14">
            {MODES.map((mode) => (
              <div key={mode.name} className="group">
                <div
                  className="h-px mb-5 transition-all duration-300 w-8 group-hover:w-14"
                  style={{ backgroundColor: mode.color }}
                />
                <h3 className="text-xl font-semibold mb-1.5 tracking-tight">
                  {mode.name}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {mode.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explanation */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr,1fr] gap-16 md:gap-24">
          <div>
            <h2 className="text-3xl md:text-[2.5rem] font-bold leading-[1.15] tracking-tight">
              Your music already
              <br />
              has a visual language.
            </h2>
            <p className="mt-4 text-lg text-[#1DB954] font-light">
              We just render it.
            </p>
          </div>
          <div className="space-y-5 text-[15px] text-zinc-500 leading-[1.75]">
            <p>
              Every track on Spotify carries data — tempo, energy, valence,
              danceability. VISUALify reads these audio features in real-time
              and translates them into animated graphics that breathe with
              your music.
            </p>
            <p>
              Connect your account, pick a mode, play something. The
              visualizer syncs instantly. Switch tracks and the whole scene
              reshapes.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-[#1DB954]">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-10">
            See what you hear.
          </h2>
          <button
            onClick={() => signIn('spotify', { callbackUrl: '/visualizer' })}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#1DB954] font-bold text-lg rounded-full transition-all duration-200 hover:bg-zinc-50 hover:scale-[1.02]"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400 tracking-wide">
          <div>
            <span className="font-bold text-zinc-900">VISUAL</span>
            <span className="text-[#1DB954]">ify</span>
          </div>
          <span>Built with Next.js, D3.js &amp; the Spotify Web API</span>
        </div>
      </footer>
    </main>
  );
}

function HomeFallback() {
  return <main className="min-h-screen bg-white" aria-hidden="true" />;
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
