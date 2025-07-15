
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { claimFreeDraw, loadDraws, useDraw, MAX_DRAWS } from '@/lib/draw-manager';
import { Gift, Coins, Leaf } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAudio } from '@/context/AudioContext';
import { Separator } from '@/components/ui/separator';

const USER_DATA_STORAGE_KEY = 'plenty-of-plants-user';
const DRAW_COST_IN_GOLD = 10;

export default function ShopPage() {
  const { toast } = useToast();
  const { playSfx } = useAudio();
  const [drawCount, setDrawCount] = useState(0);
  const [goldCount, setGoldCount] = useState(0);

  const refreshData = useCallback(() => {
    setDrawCount(loadDraws());
    try {
        const userRaw = localStorage.getItem(USER_DATA_STORAGE_KEY);
        const userData = userRaw ? JSON.parse(userRaw) : { gold: 0 };
        setGoldCount(userData.gold || 0);
    } catch (e) {
        console.error("Failed to load gold from storage", e);
        setGoldCount(0);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Refresh data when tab is focused to get latest values
    window.addEventListener('focus', refreshData);
    // Listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'plenty-of-plants-draws' || event.key === USER_DATA_STORAGE_KEY) {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('focus', refreshData);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshData]);

  const handleClaimFreeDraw = () => {
    const result = claimFreeDraw();

    if (result.success) {
      playSfx('reward');
      toast({
        title: "Free Draw Claimed!",
        description: `You now have ${result.newCount} draw(s) available.`,
      });
      setDrawCount(result.newCount);
    } else {
      toast({
        variant: "destructive",
        title: "Max Draws Reached",
        description: "You already have the maximum number of draws.",
      });
    }
  };

  const handleBuyDrawWithGold = () => {
    if (goldCount < DRAW_COST_IN_GOLD) {
        toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${DRAW_COST_IN_GOLD} gold to buy a draw.` });
        return;
    }
    if (drawCount >= MAX_DRAWS) {
        toast({ variant: "destructive", title: "Max Draws Reached", description: "You cannot buy more draws." });
        return;
    }

    try {
        // Deduct gold
        const userRaw = localStorage.getItem(USER_DATA_STORAGE_KEY);
        const userData = userRaw ? JSON.parse(userRaw) : {};
        const newGold = userData.gold - DRAW_COST_IN_GOLD;
        const newUserData = { ...userData, gold: newGold };
        localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(newUserData));
        window.dispatchEvent(new StorageEvent('storage', { key: USER_DATA_STORAGE_KEY, newValue: JSON.stringify(newUserData) }));

        // Add draw (by using the claimFreeDraw logic)
        const result = claimFreeDraw();
        if (result.success) {
            playSfx('reward');
            toast({ title: "Purchase Successful!", description: `You bought 1 draw for ${DRAW_COST_IN_GOLD} gold.` });
            refreshData();
        } else {
            // This case should theoretically not be hit due to checks above, but as a fallback:
            // Refund gold
            localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(userData));
            toast({ variant: "destructive", title: "Purchase Failed", description: "Something went wrong. Your gold was not spent." });
        }
    } catch (e) {
        console.error("Failed to process gold transaction", e);
        toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
    }
  };

  return (
    <div className="p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-2xl text-primary">Shop</h1>
      </header>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Free Draw</CardTitle>
                <CardDescription>Replenish one of your used draws.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-2xl font-bold text-chart-3">FREE</p>
            <Button onClick={handleClaimFreeDraw} className="w-full font-semibold" disabled={drawCount >= MAX_DRAWS}>
              {drawCount >= MAX_DRAWS ? "Draws Full" : "Claim"}
            </Button>
            <p className="text-xs text-muted-foreground text-center w-full">You can claim this as many times as you like to refill your draws up to the max limit.</p>
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Buy a Draw</CardTitle>
                <CardDescription>Use your gold to get a new draw.</CardDescription>
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
             <p className="text-xs text-muted-foreground text-center w-full">Your Gold: {goldCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    