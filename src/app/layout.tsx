
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/music-player';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Plenty of Plants',
  description: 'Collect and grow your own digital plant collection!',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className="font-body antialiased">
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
