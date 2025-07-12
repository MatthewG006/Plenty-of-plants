
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Gift } from 'lucide-react';

const DRAWS_STORAGE_KEY = 'plenty-of-plants-draws';
const MAX_DRAWS = 2;

export default function ShopPage() {
  const { toast } = useToast();

  const handleClaimFreeDraw = () => {
    try {
      let currentDraws = 0;
      const storedDrawsRaw = localStorage.getItem(DRAWS_STORAGE_KEY);
      if (storedDrawsRaw) {
        const storedDraws = JSON.parse(storedDrawsRaw);
        currentDraws = storedDraws.count;
      }

      if (currentDraws >= MAX_DRAWS) {
        toast({
          title: "Max Draws Reached",
          description: "You already have the maximum number of draws.",
        });
        return;
      }

      const newDrawCount = Math.min(currentDraws + 1, MAX_DRAWS);
      const newDrawsData = { count: newDrawCount };
      
      localStorage.setItem(DRAWS_STORAGE_KEY, JSON.stringify(newDrawsData));
      
      // Manually dispatch a storage event to notify other tabs (like the home page)
      window.dispatchEvent(new StorageEvent('storage', {
          key: DRAWS_STORAGE_KEY,
          newValue: JSON.stringify(newDrawsData),
      }));

      toast({
        title: "Free Draw Claimed!",
        description: `You now have ${newDrawCount} draw(s) available.`,
      });

    } catch (e) {
      console.error("Failed to update draws in localStorage", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not claim your free draw. Please try again.",
      });
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
            <Button onClick={handleClaimFreeDraw} className="w-full font-semibold">
              Claim
            </Button>
            <p className="text-xs text-muted-foreground text-center w-full">You can claim this as many times as you like to refill your draws up to the max limit.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
