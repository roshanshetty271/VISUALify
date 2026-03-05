'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { signIn, signOut } from 'next-auth/react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server Configuration Error',
      description: 'There is a problem with the server configuration. Please try again later.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to sign in.',
    },
    Verification: {
      title: 'Verification Error',
      description: 'The verification link may have expired or already been used.',
    },
    OAuthSignin: {
      title: 'Sign In Error',
      description: 'Could not start the sign in process. Please try again.',
    },
    OAuthCallback: {
      title: 'Callback Error',
      description: 'Could not complete the sign in process. Please try again.',
    },
    OAuthCreateAccount: {
      title: 'Account Creation Error',
      description: 'Could not create your account. Please try again.',
    },
    Callback: {
      title: 'Callback Error',
      description: 'Something went wrong during authentication. Please try again.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An unexpected error occurred. Please try again.',
    },
  };

  const { title, description } = errorMessages[error || 'Default'] || errorMessages.Default;

  const handleRetry = async () => {
    // Clear any stale session/cookies first, then start fresh login
    await signOut({ redirect: false });
    signIn('spotify', { callbackUrl: '/visualizer' });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-zinc-400 mb-8">{description}</p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-green-500 text-black font-semibold rounded-full hover:bg-green-400 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full py-3 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-colors"
          >
            Go Home
          </Link>
        </div>

        {/* Debug Info (only in dev) */}
        {process.env.NODE_ENV === 'development' && error && (
          <p className="mt-6 text-xs text-zinc-600">Error code: {error}</p>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
        </div>
      )}
    >
      <AuthErrorContent />
    </Suspense>
  );
}
