
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { claimFreeDraw, loadDraws } from '@/lib/draw-manager';
import { Gift } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ShopPage() {
  const { toast } = useToast();
  const [newDrawCount, setNewDrawCount] = useState(0);

  // Effect to load draws on mount to have an initial value
  useEffect(() => {
    setNewDrawCount(loadDraws());
  }, []);

  const handleClaimFreeDraw = () => {
    const result = claimFreeDraw();

    if (result.success) {
      toast({
        title: "Free Draw Claimed!",
        description: `You now have ${result.newCount} draw(s) available.`,
      });
      setNewDrawCount(result.newCount); // update state to reflect change
    } else {
      toast({
        title: "Max Draws Reached",
        description: "You already have the maximum number of draws.",
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

    