
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function ContestPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between text-white p-4 relative"
      style={{ backgroundImage: "url('/contest.png')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative z-10 text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm mt-24">
        <h1 className="text-4xl font-bold mb-4">Plant Beauty Contest</h1>
        <p className="text-lg mb-6">This feature is under construction. Check back later to enter your best plants!</p>
        <Button asChild>
          <Link href="/community/park">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to the Park
          </Link>
        </Button>
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <Image src="/vote.png" alt="Voting buttons" width={500} height={250} className="max-w-sm w-full" data-ai-hint="vote buttons" />
      </div>
    </div>
  );
}
