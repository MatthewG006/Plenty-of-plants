
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/music-player';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Plenty of Plants',
  description: 'Collect and grow your own digital plant collection!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="font-body antialiased">
        <AuthProvider>
          <AudioProvider>
            {children}
            <Toaster />
            <MusicPlayer />
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
