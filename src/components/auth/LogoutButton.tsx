'use client';

import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
    >
      Logout
    </button>
  );
}

