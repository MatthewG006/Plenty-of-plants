
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/music-player';
import { AuthProvider } from '@/context/AuthContext';
import { Belleza, Alegreya } from 'next/font/google';

const belleza = Belleza({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-belleza',
});

const alegreya = Alegreya({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-alegreya',
});

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#90EE90" />
      </head>
      <body className={`${belleza.variable} ${alegreya.variable} font-body antialiased`}>
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
