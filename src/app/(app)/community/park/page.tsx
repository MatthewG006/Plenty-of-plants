
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ParkClientPage = dynamic(() => import('./park-client-page'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export default function ParkPage() {
  return <ParkClientPage />;
}
