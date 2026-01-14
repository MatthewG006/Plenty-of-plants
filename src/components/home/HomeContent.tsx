
'use client';

import ChallengeList from './ChallengeList';
import Draws from './Draws';
import LatestPlant from './LatestPlant';
import GameTips from './GameTips';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { User, Settings, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function HomeContent() {
  const { user } = useAuth();

  return (
    <>
      <div className="p-4 space-y-6 bg-white pb-20">
        <header className="flex items-center justify-between">
           <div className="w-10">
            {user && (
              <Button asChild variant="ghost" size="icon">
                <Link href="/profile"><User /></Link>
              </Button>
            )}
          </div>
          <h1 className="text-3xl text-primary font-bold text-center">
            Plenty Of Plants
          </h1>
          <div className="w-10">
             {user ? (
               <Button asChild variant="ghost" size="icon">
                <Link href="/settings"><Settings /></Link>
              </Button>
             ) : (
               <Button asChild variant="ghost" size="icon">
                <Link href="/login"><LogIn /></Link>
              </Button>
             )}
          </div>
        </header>

        <main className="space-y-6">
          {user ? (
            <>
              <Draws />
              <LatestPlant />
              <Separator />
              <ChallengeList />
            </>
          ) : (
             <div className="text-center p-4 border-2 border-dashed border-primary/20 rounded-lg">
                <h2 className="text-xl font-semibold text-primary">Welcome!</h2>
                <p className="text-muted-foreground mt-2 mb-4">Log in to start collecting and growing your unique AI-generated plants.</p>
                <Button asChild size="lg">
                    <Link href="/login">
                        <LogIn className="mr-2 h-5 w-5" />
                        Login to Play
                    </Link>
                </Button>
             </div>
          )}
          <Separator />
          <GameTips />
        </main>

      </div>
      <footer className="text-center text-xs text-muted-foreground pb-20 bg-white">
        <p>&copy; 2025 Sky Mountain Graphics. All Rights Reserved.</p>
      </footer>
    </>
  );
}
