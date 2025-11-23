
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { claimFreeDraw, MAX_DRAWS } from '@/lib/draw-manager';
import { Gift, Coins, Leaf, Clock, Loader2, Droplets, Sparkles, Zap, Pipette, RefreshCw, Star, Package, Gem, MessageCircle, ShoppingCart, Video } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from '@/context/AudioContext';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { purchaseCosmetic, purchaseSprinkler, purchaseWaterRefill, purchaseBundle, purchasePlantChat, updateUserRubies } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { grantAdReward } from '@/app/actions/grant-ad-reward';
import PayPalPurchase from '@/components/PayPalPurchase';

const DRAW_COST_IN_GOLD = 50;
const GLITTER_COST_IN_GOLD = 25;
const SHEEN_COST_IN_GOLD = 50;
const RAINBOW_GLITTER_COST_IN_GOLD = 75;
const RED_GLITTER_COST_IN_GOLD = 100;
const SPRINKLER_COST_IN_GOLD = 250;
const WATER_REFILL_COST_IN_GOLD = 15;
const BUNDLE_COST_IN_GOLD = 250;
const PLANT_CHAT_COST_IN_RUBIES = 1;

function VideoAdDialog({ open, onOpenChange, onSkip, countdown }: { open: boolean; onOpenChange: (open: boolean) => void; onSkip: () => void; countdown: number; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" onPointerDownOutside={(e) => e.preventDefault()} >
        <DialogHeader>
          <DialogTitle className="sr-only">Video Ad</DialogTitle>
          <DialogDescription className="sr-only">A placeholder for a video ad.</DialogDescription>
        </DialogHeader>
        <div className="aspect-video bg-black flex flex-col items-center justify-center text-white relative">
          <Video className="w-16 h-16 text-muted-foreground" />
          <p className="text-lg font-semibold mt-4">Video Ad Placeholder</p>
          <p className="text-sm text-muted-foreground">Your ad would be shown here.</p>
          <div className="absolute bottom-4 right-4">
            {countdown > 0 ? (
              <p className="text-sm bg-black/50 rounded-full px-3 py-1">Reward in {countdown}...</p>
            ) : (
              <Button onClick={onSkip} variant="secondary" size="sm">
                Skip
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Extend the Window interface to include our custom Android interface
declare global {
  interface Window {
    AndroidAdInterface?: {
      showDailyFreeDrawAd: () => void;
    };
    onRewardUser?: () => void;
  }
}

export default function ShopPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownTimerRef =  useRef<NodeJS.Timeout | null>(null);
  const [payPalClientId, setPayPalClientId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the client ID from our secure API route
    fetch('/api/paypal-client-id')
      .then(res => res.json())
      .then(data => {
        if (data.clientId) {
          setPayPalClientId(data.clientId);
        }
      })
      .catch(err => console.error("Failed to fetch PayPal client ID", err));
  }, []);

  const onAdReward = useCallback(async () => {
    if (!user) return;
    
    // Call the secure server action to grant the reward
    const result = await grantAdReward(user.uid);
    
    if (result.success) {
      playSfx('reward');
      toast({
        title: "Draw Replenished!",
        description: "You've received one free draw. Happy growing!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Reward Grant Failed",
        description: result.message || "Could not grant reward. Please try again later.",
      });
    }
    setIsAdLoading(false);
  }, [user, playSfx, toast]);


  // This effect simulates the ad flow for web fallback
  const handleSkipAd = useCallback(() => {
      if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
      }
      setShowAd(false);
      onAdReward();
  }, [onAdReward]);
  
  useEffect(() => {
    if (showAd) {
      setCountdown(5);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }
    
    return () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }
    }
  }, [showAd]);

  useEffect(() => {
    // This function will be called by the native Android wrapper after a real ad is watched.
    window.onRewardUser = onAdReward;

    // Cleanup the global function when the component unmounts
    return () => {
      delete window.onRewardUser;
    };
  }, [onAdReward]);


  const handlePreClaimFreeDraw = () => {
      setIsAdLoading(true);
      // Check if the native Android interface exists
      if (window.AndroidAdInterface && typeof window.AndroidAdInterface.showDailyFreeDrawAd === 'function') {
        // If it exists, call the native function to show the real ad.
        // The native code will then call `window.onRewardUser()` upon completion.
        window.AndroidAdInterface.showDailyFreeDrawAd();
      } else {
        // If not, fall back to the placeholder ad dialog for web testing.
        console.log("Android ad interface not found. Showing placeholder ad flow.");
        setShowAd(true);
      }
  };
  

    const handleBuyWaterRefill = async () => {
        if (!user || !gameData) return;

        if (gameData.gold < WATER_REFILL_COST_IN_GOLD) {
            toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${WATER_REFILL_COST_IN_GOLD} gold.` });
            return;
        }

        try {
            await purchaseWaterRefill(user.uid, WATER_REFILL_COST_IN_GOLD);
            playSfx('reward');
            toast({ title: "Purchase Successful!", description: `You bought 1 Water Refill.` });
        } catch (e: any) {
            console.error("Failed to purchase water refill", e);
            toast({ variant: "destructive", title: "Error", description: e.message || "Could not complete the purchase." });
        }
    };

    const handleBuyGlitter = async () => {
      if (!user || !gameData) return;

      if (gameData.gold < GLITTER_COST_IN_GOLD) {
          toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${GLITTER_COST_IN_GOLD} gold.` });
          return;
      }

      try {
          await purchaseCosmetic(user.uid, 'glitterCount', 1, GLITTER_COST_IN_GOLD);
          playSfx('reward');
          toast({ title: "Purchase Successful!", description: `You bought 1 Glitter Pack!` });
      } catch (e: any) {
          console.error("Failed to purchase glitter", e);
          toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
      }
  };


  const handleBuySprinkler = async () => {
      if (!user || !gameData) return;

      if (gameData.gold < SPRINKLER_COST_IN_GOLD) {
          toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${SPRINKLER_COST_IN_GOLD} gold.` });
          return;
      }

      try {
          await purchaseSprinkler(user.uid, SPRINKLER_COST_IN_GOLD);
          playSfx('reward');
          toast({ title: "Purchase Successful!", description: `You bought the Sprinkler! Find it in your room.` });
      } catch (e: any) {
          console.error("Failed to purchase sprinkler", e);
          toast({ variant: "destructive", title: "Error", description: e.message || "Could not complete the purchase." });
      }
  };
  
    const handleBuySheen = async () => {
      if (!user || !gameData) return;

      if (gameData.gold < SHEEN_COST_IN_GOLD) {
          toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${SHEEN_COST_IN_GOLD} gold.` });
          return;
      }

      try {
          await purchaseCosmetic(user.uid, 'sheenCount', 1, SHEEN_COST_IN_GOLD);
          playSfx('reward');
          toast({ title: "Purchase Successful!", description: `You bought 1 Sheen Pack!` });
      } catch (e: any) {
          console.error("Failed to purchase sheen", e);
          toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
      }
  };

  const handleBuyRainbowGlitter = async () => {
      if (!user || !gameData) return;

      if (gameData.gold < RAINBOW_GLITTER_COST_IN_GOLD) {
          toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${RAINBOW_GLITTER_COST_IN_GOLD} gold.` });
          return;
      }

      try {
          await purchaseCosmetic(user.uid, 'rainbowGlitterCount', 1, RAINBOW_GLITTER_COST_IN_GOLD);
          playSfx('reward');
          toast({ title: "Purchase Successful!", description: `You bought 1 Rainbow Glitter Pack!` });
      } catch (e: any) {
          console.error("Failed to purchase rainbow glitter", e);
          toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
      }
  };
  
    const handleBuyRedGlitter = async () => {
      if (!user || !gameData) return;

      if (gameData.gold < RED_GLITTER_COST_IN_GOLD) {
          toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${RED_GLITTER_COST_IN_GOLD} gold.` });
          return;
      }

      try {
          await purchaseCosmetic(user.uid, 'redGlitterCount', 1, RED_GLITTER_COST_IN_GOLD);
          playSfx('reward');
          toast({ title: "Purchase Successful!", description: `You bought 1 Red Glitter Pack!` });
      } catch (e: any) {
          console.error("Failed to purchase red glitter", e);
          toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
      }
  };


  const handleBuyDrawWithGold = async () => {
    if (!user || !gameData) return;

    if (gameData.gold < DRAW_COST_IN_GOLD) {
        toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${DRAW_COST_IN_GOLD} gold to buy a draw.` });
        return;
    }
    if (gameData.draws >= MAX_DRAWS) {
        toast({ variant: "destructive", title: "Max Draws Reached", description: "You cannot buy more draws." });
        return;
    }

    try {
        const result = await claimFreeDraw(user.uid, { useGold: true, cost: DRAW_COST_IN_GOLD });
        if (result.success) {
            playSfx('reward');
            toast({ title: "Purchase Successful!", description: `You bought 1 draw for ${DRAW_COST_IN_GOLD} gold.` });
        } else if (result.reason === 'not_enough_gold') {
             toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${DRAW_COST_IN_GOLD} gold to buy a draw.` });
        } else {
            toast({ variant: "destructive", title: "Purchase Failed", description: "Something went wrong. Your gold was not spent." });
        }
    } catch (e) {
        console.error("Failed to process gold transaction", e);
        toast({ variant: "destructive", title: "Error", description: "Could not complete the purchase." });
    }
  };

  const handleBuyBundle = async () => {
    if (!user || !gameData) return;

    if (gameData.gold < BUNDLE_COST_IN_GOLD) {
        toast({ variant: "destructive", title: "Not Enough Gold", description: `You need ${BUNDLE_COST_IN_GOLD} gold.` });
        return;
    }

    try {
        await purchaseBundle(user.uid, BUNDLE_COST_IN_GOLD);
        playSfx('reward');
        toast({ title: "Bundle Purchased!", description: "You received all items from the Sparkle Bundle." });
    } catch (e: any) {
        console.error("Failed to purchase bundle", e);
        toast({ variant: "destructive", title: "Error", description: e.message || "Could not complete the purchase." });
    }
  };

  const handleBuyPlantChat = async () => {
    if (!user || !gameData) return;

    if (gameData.rubyCount < PLANT_CHAT_COST_IN_RUBIES) {
        toast({ variant: "destructive", title: "Not Enough Rubies", description: `You need ${PLANT_CHAT_COST_IN_RUBIES} rubies.` });
        return;
    }

    try {
        await purchasePlantChat(user.uid, PLANT_CHAT_COST_IN_RUBIES);
        playSfx('reward');
        toast({ title: "Purchase Successful!", description: "You bought a Plant Chat token. Use it on a max-level plant!" });
    } catch (e: any) {
        console.error("Failed to purchase plant chat", e);
        toast({ variant: "destructive", title: "Error", description: e.message || "Could not complete the purchase." });
    }
  };

  const handleRubyPurchaseSuccess = async () => {
    if (!user) return;
    try {
      await updateUserRubies(user.uid, 5);
      toast({ title: 'Purchase Successful!', description: 'You received 5 Rubies.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reward Error', description: 'Failed to grant rubies.' });
    }
  };

  
  if (!user || !gameData) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }
  
  const goldCount = gameData.gold;
  const rubyCount = gameData.rubyCount;
  const drawCount = gameData.draws;

  return (
    <div className="p-4">
      <header className="flex flex-col items-center justify-center pb-4 text-center">
        <h1 className="text-3xl text-primary">Shop</h1>
        <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 rounded-full bg-yellow-100/80 px-3 py-1 border border-yellow-300/80">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-yellow-700">{goldCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-red-100/80 px-3 py-1 border border-red-300/80">
                <Gem className="h-5 w-5 text-red-500" />
                <span className="font-bold text-red-700">{rubyCount}</span>
            </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-xl">Replenish a Draw</CardTitle>
                <CardDescription>Watch an ad to get a free draw.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-2xl font-bold text-chart-3">FREE</p>
            <Button onClick={handlePreClaimFreeDraw} className="w-full font-semibold" disabled={isAdLoading || drawCount >= MAX_DRAWS}>
              {isAdLoading ? <Loader2 className="animate-spin" /> : drawCount >= MAX_DRAWS ? "Draws Full" : "Watch Ad for Free Draw"}
            </Button>
          </CardContent>
        </Card>

        <Separator />

         <Card className="shadow-sm border-purple-500/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-8 w-8 text-purple-500" />
              <div>
                <CardTitle className="text-xl text-purple-600">Premium Shop</CardTitle>
                <CardDescription>Special items available for purchase.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             {payPalClientId ? (
                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-primary">Ruby Pack</p>
                            <p className="text-sm text-muted-foreground">Get 5 rubies to unlock special features.</p>
                        </div>
                        <p className="font-bold text-lg text-primary">$0.99</p>
                    </div>
                    <PayPalPurchase 
                        clientId={payPalClientId} 
                        amount="0.99"
                        description="5 Rubies Pack"
                        onSuccess={handleRubyPurchaseSuccess}
                    />
                </div>
             ) : (
                <div className="text-center text-muted-foreground">Loading payment options...</div>
             )}
          </CardContent>
        </Card>

        <Separator />
        
        <Card className="shadow-sm border-red-500/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <MessageCircle className="h-8 w-8 text-red-500" />
              <div>
                <CardTitle className="text-xl text-red-600">Plant Chat Token</CardTitle>
                <CardDescription>Unlock the ability to chat with one of your max-level plants.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
                <Gem className="h-6 w-6 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{PLANT_CHAT_COST_IN_RUBIES}</p>
            </div>
            <Button onClick={handleBuyPlantChat} variant="destructive" className="w-full font-semibold bg-red-500 hover:bg-red-600" disabled={rubyCount < PLANT_CHAT_COST_IN_RUBIES}>
                {rubyCount < PLANT_CHAT_COST_IN_RUBIES ? "Not Enough Rubies" : "Buy Chat Token"}
            </Button>
            <p className="text-xs text-muted-foreground text-center w-full">
                You have {gameData.plantChatTokens} token(s)
            </p>
          </CardContent>
        </Card>

        <Separator />


        <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Sparkle Bundle</CardTitle>
                    <CardDescription>A pack of all cosmetics plus a refill! 10 gold off!</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{BUNDLE_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuyBundle} className="w-full font-semibold" disabled={goldCount < BUNDLE_COST_IN_GOLD}>
                    {goldCount < BUNDLE_COST_IN_GOLD ? "Not Enough Gold" : "Buy Bundle"}
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Leaf className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Buy a Draw</CardTitle>
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

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Droplets className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Sprinkler</CardTitle>
                    <CardDescription>A one-time purchase to water all your eligible plants at once.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{SPRINKLER_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuySprinkler} className="w-full font-semibold" disabled={gameData.sprinklerUnlocked || goldCount < SPRINKLER_COST_IN_GOLD}>
                    {gameData.sprinklerUnlocked ? "Owned" : goldCount < SPRINKLER_COST_IN_GOLD ? "Not Enough Gold" : "Buy"}
                </Button>
              </CardContent>
            </Card>

             <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <RefreshCw className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Water Refill</CardTitle>
                    <CardDescription>Buy a refill to reset a single plant's daily watering limit.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{WATER_REFILL_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuyWaterRefill} className="w-full font-semibold" disabled={goldCount < WATER_REFILL_COST_IN_GOLD}>
                    {goldCount < WATER_REFILL_COST_IN_GOLD ? "Not Enough Gold" : "Buy (+1)"}
                </Button>
                <p className="text-xs text-muted-foreground text-center w-full">
                    You have {gameData.waterRefillCount} refill(s)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Glitter Pack</CardTitle>
                    <CardDescription>Make one of your plants permanently sparkle with glitter.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{GLITTER_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuyGlitter} className="w-full font-semibold" disabled={goldCount < GLITTER_COST_IN_GOLD}>
                    {goldCount < GLITTER_COST_IN_GOLD ? "Not Enough Gold" : "Buy Glitter (+1)"}
                </Button>
                 <p className="text-xs text-muted-foreground text-center w-full">
                    You have {gameData.glitterCount} pack(s)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Star className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">Sheen Pack</CardTitle>
                    <CardDescription>Make one of your plants permanently shimmer with a beautiful sheen.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{SHEEN_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuySheen} className="w-full font-semibold" disabled={goldCount < SHEEN_COST_IN_GOLD}>
                    {goldCount < SHEEN_COST_IN_GOLD ? "Not Enough Gold" : "Buy Sheen (+1)"}
                </Button>
                 <p className="text-xs text-muted-foreground text-center w-full">
                    You have {gameData.sheenCount} sheen pack(s)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Sparkles className="h-8 w-8 text-pink-500" />
                  <div>
                    <CardTitle className="text-xl">Rainbow Glitter</CardTitle>
                    <CardDescription>Make one of your plants sparkle with all the colors of the rainbow!</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{RAINBOW_GLITTER_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuyRainbowGlitter} className="w-full font-semibold" disabled={goldCount < RAINBOW_GLITTER_COST_IN_GOLD}>
                    {goldCount < RAINBOW_GLITTER_COST_IN_GOLD ? "Not Enough Gold" : "Buy Glitter (+1)"}
                </Button>
                 <p className="text-xs text-muted-foreground text-center w-full">
                    You have {gameData.rainbowGlitterCount} pack(s)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Sparkles className="h-8 w-8 text-red-500" />
                  <div>
                    <CardTitle className="text-xl">Red Glitter</CardTitle>
                    <CardDescription>Make one of your plants sparkle with a fiery red glitter!</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{RED_GLITTER_COST_IN_GOLD}</p>
                </div>
                <Button onClick={handleBuyRedGlitter} className="w-full font-semibold" disabled={goldCount < RED_GLITTER_COST_IN_GOLD}>
                    {goldCount < RED_GLITTER_COST_IN_GOLD ? "Not Enough Gold" : "Buy Glitter (+1)"}
                </Button>
                 <p className="text-xs text-muted-foreground text-center w-full">
                    You have {gameData.redGlitterCount} pack(s)
                </p>
              </CardContent>
            </Card>
        </div>
      </div>
      <VideoAdDialog
        open={showAd}
        onOpenChange={setShowAd}
        onSkip={handleSkipAd}
        countdown={countdown}
      />
    </div>
  );
}
