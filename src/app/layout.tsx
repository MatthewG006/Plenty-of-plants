import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/providers';
import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return {
    title: 'Plenty of Plants',
    description: 'Collect and grow your own digital plant collection!',
    manifest: '/manifest.webmanifest',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
