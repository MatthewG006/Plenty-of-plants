
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { claimFreeDraw, loadDraws, MAX_DRAWS, hasClaimedDailyDraw } from '@/lib/draw-manager';
import { Gift, Coins, Leaf, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAudio } from '@/context/AudioContext';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { updateUserGold } from '@/lib/firestore';
import { useRouter } from 'next/navigation';

const DRAW_COST_IN_GOLD = 10;

function getNextDrawTimeString() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
}

export default function ShopPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  
  const [drawCount, setDrawCount] = useState(0);
  const [dailyDrawClaimed, setDailyDrawClaimed] = useState(false);
  const [nextDrawTime, setNextDrawTime] = useState(getNextDrawTimeString());
  
  const refreshData = useCallback(async () => {
    if (!user) return;
    setDrawCount(await loadDraws(user.uid));
    setDailyDrawClaimed(await hasClaimedDailyDraw(user.uid));
  }, [user]);

  useEffect(() => {
    if (gameData) {
      setDrawCount(gameData.draws || 0);
      const checkClaimed = async () => {
        if(user) setDailyDrawClaimed(await hasClaimedDailyDraw(user.uid));
      };
      checkClaimed();
    }
  }, [gameData, user]);


  useEffect(() => {
    refreshData();
    const timer = setInterval(() => {
        setNextDrawTime(getNextDrawTimeString());
        refreshData();
    }, 60000);

    return () => {
        clearInterval(timer);
    };
  }, [refreshData]);

  const handleClaimFreeDraw = async () => {
    if (!user) return;
    const result = await claimFreeDraw(user.uid);

    if (result.success) {
      playSfx('reward');
      toast({
        title: "Free Draw Claimed!",
        description: "Come back tomorrow for another one.",
      });
      refreshData();
    } else {
      toast({
        variant: "destructive",
        title: result.reason === 'max_draws' ? "Max Draws Reached" : "Already Claimed",
        description: result.reason === 'max_draws' ? "You already have the maximum number of draws." : "You can claim your next free draw tomorrow.",
      });
    }
  };

  const handleBuyDrawWithGold = async () => {
    if (!user || !gameData) return;

    if (gameData.gold < DRAW_COST_IN_GOLD) {
        toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${DRAW_COST_IN_GOLD} gold to buy a draw.` });
        return;
    }
    if (drawCount >= MAX_DRAWS) {
        toast({ variant: "destructive", title: "Max Draws Reached", description: "You cannot buy more draws." });
        return;
    }

    try {
        const result = await claimFreeDraw(user.uid, { bypassTimeCheck: true });
        if (result.success) {
            await updateUserGold(user.uid, -DRAW_COST_IN_GOLD);
            playSfx('reward');
            toast({ title: "Purchase Successful!", description: `You bought 1 draw for ${DRAW_COST_IN_GOLD} gold.` });
            refreshData();
        } else {
            toast({ variant: "destructive", title: "Purchase Failed", description: "Something went wrong. Your gold was not spent." });
        }
    } catch (e) {
        console.error("Failed to process gold transaction", e);
        toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
    }
  };

  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  const goldCount = gameData.gold || 0;

  return (
    <div className="p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-3xl text-primary">Shop</h1>
        <div className="flex items-center gap-2 rounded-full bg-yellow-100/80 px-3 py-1 border border-yellow-300/80">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="font-bold text-yellow-700">{goldCount}</span>
        </div>
      </header>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Daily Free Draw</CardTitle>
                <CardDescription>Claim one free draw every day.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-2xl font-bold text-chart-3">FREE</p>
            <Button onClick={handleClaimFreeDraw} className="w-full font-semibold" disabled={drawCount >= MAX_DRAWS || dailyDrawClaimed}>
              {dailyDrawClaimed ? "Claimed for Today" : drawCount >= MAX_DRAWS ? "Draws Full" : "Claim"}
            </Button>
            {dailyDrawClaimed && (
                <div className="text-xs text-muted-foreground text-center w-full flex items-center justify-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Next free draw in {nextDrawTime}</span>
                </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Buy a Draw</CardTitle>
                <CardDescription>Use your gold to get another draw.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
                <Coins className="h-6 w-6 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-600">{DRAW_COST_IN_GOLD}</p>
            </div>
            <Button onClick={handleBuyDrawWithGold} className="w-full font-semibold" disabled={goldCount < DRAW_COST_IN_GOLD || drawCount >= MAX_DRAWS}>
              {drawCount >= MAX_DRAWS ? "Draws Full" : goldCount < DRAW_COST_IN_GOLD ? "Not Enough Gold" : "Buy Draw"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
