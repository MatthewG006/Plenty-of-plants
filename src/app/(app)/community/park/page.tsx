
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ParkPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center text-white p-4"
      style={{ backgroundImage: "url('/park.png')" }}
    >
      <div className="bg-black/50 p-8 rounded-lg text-center shadow-lg backdrop-blur-sm">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Park</h1>
        <p className="text-lg mb-6">This area is under construction. Come back soon to see what's growing!</p>
        <Button asChild>
          <Link href="/community">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Showcase
          </Link>
        </Button>
      </div>
    </div>
  );
}
