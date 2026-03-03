'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // Pre-warm the CSRF cookie so the first sign-in click works instantly.
    // Without this, the CSRF token might not exist yet on a cold visit,
    // causing the OAuth callback to fail with an OAuthCallback error.
    fetch('/api/auth/csrf');
  }, []);

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      signIn('spotify');
    }
  }, [session?.error]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}

