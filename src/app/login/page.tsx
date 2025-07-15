
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/context/AudioContext';

export default function SplashPage() {
  const { isPlaying, togglePlay, playSfx } = useAudio();

  const handleEnter = () => {
    if (!isPlaying) {
      togglePlay();
    }
    playSfx('whoosh');
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-app-gradient p-4">
      <div className="flex flex-col items-center justify-center text-center animate-fade-in-up">
        <Image src="/logo.png" alt="Plenty of Plants Logo" width={320} height={320} className="mb-2" data-ai-hint="plant logo" />
        <p className="mt-2 text-lg text-foreground/80 font-body">
          Your digital conservatory awaits.
        </p>
        <Button asChild className="mt-12 animate-pulse-subtle" size="lg" disableSfx>
          <Link href="/home" className="font-headline text-xl px-8" onClick={handleEnter}>Tap to Enter</Link>
        </Button>
      </div>
    </div>
  );
}
