'use client';

import ChallengeList from './ChallengeList';
import Draws from './Draws';
import LatestPlant from './LatestPlant';
import GameTips from './GameTips';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { User, Settings, LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function HomeContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6 bg-white pb-20">
        <header>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="w-10">
                <Button asChild variant="ghost" size="icon">
                  <Link href="/profile"><User /></Link>
                </Button>
              </div>
              <h1 className="text-3xl text-primary font-bold text-center">
                Plenty Of Plants
              </h1>
              <div className="flex w-20 justify-end">
                <Button asChild variant="ghost" size="icon">
                  <Link href="/settings"><Settings /></Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-3xl text-primary font-bold">
                Plenty Of Plants
              </h1>
              <Button asChild>
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link>
              </Button>
            </div>
          )}
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
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Welcome!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Collect and grow an adorable collection of plants, then use the power of ai to evolve them into new elegant forms. Log in or create an account to start your journey!
                </p>
              </CardContent>
            </Card>
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
