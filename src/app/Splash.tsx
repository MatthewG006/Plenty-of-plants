
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

export default function Splash() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // const [showSplash, setShowSplash] = useState(false);
  const { startMusic } = useAudio();

  useEffect(() => {
    // This logic now bypasses the splash screen entirely and redirects.
    // This makes '/home' the effective entry point for all users.
    if (!loading) {
      router.replace('/home');
    }
    // The original logic is commented out to disable the splash screen.
    /*
    if (!loading) {
      if (sessionStorage.getItem('hasEntered')) {
        router.replace(user ? '/home' : '/login');
      } else {
        setShowSplash(true);
      }
    }
    */
  }, [loading, user, router]);

  const handleEnter = () => {
    sessionStorage.setItem('hasEntered', 'true');
    startMusic();
    router.push(user ? '/home' : '/login');
  };

  // Render a loading spinner during the brief redirect period.
  // The original splash screen UI is commented out.
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-splash-image bg-cover bg-center">
      <Loader2 className="h-12 w-12 animate-spin text-white" />
    </div>
  );

  /*
  if (!showSplash) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-splash-image bg-cover bg-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-between p-4 bg-splash-image bg-cover bg-center">
      <div className="flex-grow-[1] z-10" />
      <div className="z-10 flex flex-col items-center justify-center text-center animate-fade-in-up">
        <Image src="https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/logo.png?alt=media&token=cda9338a-78db-482a-9784-d61385837c10" alt="Plenty of Plants Logo" width={320} height={320} className="" data-ai-hint="plant logo" priority unoptimized />
        <p className="text-lg text-white font-bold -mt-16" style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}>
          Your Digital Conservatory Awaits.
        </p>
        <Button onClick={handleEnter} className="mt-12 animate-pulse-subtle bg-blue-500 hover:bg-blue-600" size="lg">
          <span className="text-xl px-8">Tap to Enter</span>
        </Button>
      </div>
      <div className="flex-grow-[3] z-10" />
    </div>
  );
  */
}
