
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const { isPlaying, togglePlay, playSfx } = useAudio();
  const { user } = useAuth();
  const router = useRouter();

  const handleEnter = () => {
    if (!isPlaying) {
      togglePlay();
    }
    playSfx('whoosh');
    router.push(user ? '/home' : '/login');
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-between p-4 bg-splash-gradient">
      <div className="flex-grow-[1] z-10" />
      <div className="z-10 flex flex-col items-center justify-center text-center animate-fade-in-up">
        <Image src="/logo.png" alt="Plenty of Plants Logo" width={320} height={320} className="" data-ai-hint="plant logo" />
        <p className="text-lg text-foreground/80 font-body -mt-16">
          Your digital conservatory awaits.
        </p>
        <Button onClick={handleEnter} className="mt-12 animate-pulse-subtle" size="lg" disableSfx>
          <span className="font-headline text-xl px-8">Tap to Enter</span>
        </Button>
      </div>
      <div className="flex-grow-[3] z-10" />
    </div>
  );
}
