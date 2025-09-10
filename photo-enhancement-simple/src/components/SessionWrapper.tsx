'use client';

import { SessionProvider } from 'next-auth/react';
import Navigation from './Navigation';

interface SessionWrapperProps {
  children: React.ReactNode;
}

export default function SessionWrapper({ children }: SessionWrapperProps) {
  return (
    <SessionProvider>
      <Navigation />
      <main className="min-h-screen">
        {children}
      </main>
    </SessionProvider>
  );
}