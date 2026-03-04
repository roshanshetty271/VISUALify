'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function VisualizerNav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
      <Link href="/visualizer" className="pointer-events-auto">
        <span className="text-lg font-display font-bold">
          <span className="text-white">VISUAL</span>
          <span className="text-[var(--theme-primary)]">ify</span>
        </span>
      </Link>

      <div className="flex items-center gap-1 pointer-events-auto">
        <Link
          href="/dashboard"
          className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Dashboard
        </Link>
        <div className="w-px h-3.5 bg-zinc-700 mx-1" />
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
