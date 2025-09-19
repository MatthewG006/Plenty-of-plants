
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { useEffect } from 'react';
import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/MusicPlayer';


// export const metadata: Metadata = {
//   title: 'Plenty of Plants',
//   description: 'Collect and grow your own digital plant collection!',
//   manifest: '/manifest.webmanifest',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('Service Worker registered with scope:', registration.scope))
        .catch(error => console.error('Service Worker registration failed:', error));
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Plenty of Plants</title>
        <meta name="description" content="Collect and grow your own digital plant collection!" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <AudioProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <MusicPlayer />
          </AuthProvider>
        </AudioProvider>
      </body>
    </html>
  );
}
