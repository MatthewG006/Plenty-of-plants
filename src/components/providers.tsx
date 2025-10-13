'use client';

import { type ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AudioProvider } from '@/context/AudioContext';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('Service Worker registered with scope:', registration.scope))
        .catch(error => console.error('Service Worker registration failed:', error));
    }
  }, []);

  return (
    <AudioProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AudioProvider>
  );
}
