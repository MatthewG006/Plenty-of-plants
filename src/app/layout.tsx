import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/providers';
import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return {
    title: 'Plenty of Plants',
    description: 'Collect and grow your own digital plant collection!',
    manifest: 'https://storage.googleapis.com/plentyofplants-108e8.firebasestorage.app/manifest.webmanifest',
    icons: {
      icon: 'https://storage.googleapis.com/plentyofplants-108e8.firebasestorage.app/favicon.ico',
      apple: 'https://storage.googleapis.com/plentyofplants-108e8.firebasestorage.app/icon-512.png',
    }
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
