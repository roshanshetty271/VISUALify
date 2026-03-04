'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { ThemeSelector } from './ui/ThemeSelector';

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  if (pathname === '/' || pathname === '/visualizer') return null;

  const links = [
    { href: '/visualizer', label: 'Visualizer' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <nav className="bg-black/80 backdrop-blur-md border-b border-zinc-800/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/visualizer" className="flex items-center">
            <span className="text-lg font-display font-bold">
              <span className="text-white">VISUAL</span>
              <span className="text-[var(--theme-primary)]">ify</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <ThemeSelector />
            <div className="w-px h-6 bg-zinc-800/60 mx-1" />
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-[var(--theme-primary)] text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="w-px h-5 bg-zinc-700 mx-2" />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-1.5 rounded-md text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-zinc-800/60">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-[var(--theme-primary)] text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="block w-full text-left px-3 py-2.5 rounded-md text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

