'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const ClientSideProviders = dynamic(
  () => import('./client-providers').then((mod) => mod.ClientSideProviders),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-splash-image">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    ),
  }
);
