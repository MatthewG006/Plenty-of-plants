
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X, Loader2, Leaf, Award, Coins, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import type { Plant } from '@/interfaces/plant';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDraw, MAX_DRAWS, refillDraws } from '@/lib/draw-manager';
import { useAudio } from '@/context/AudioContext';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { savePlant } from '@/lib/firestore';
import { compressImage } from '@/lib/image-compression';
import { drawPlantAction } from '@/app/actions/draw-plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { Challenge, challenges, claimChallengeReward, checkAndResetChallenges, updateCollectionProgress } from '@/lib/challenge-manager';
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";


function NewPlantDialog({ plant, open, onOpenChange }: { plant: DrawPlantOutput | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!plant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center">A new plant!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={plant.imageDataUri} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-2xl font-semibold text-primary">{plant.name}</h3>
                    <p className="text-muted-foreground text-center">{plant.description}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="w-full text-lg">Collect</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ChallengeCard({ challenge, onClaim, isClaiming }: { challenge: Challenge, onClaim: (challengeId: string) => void, isClaiming: boolean }) {
    const isComplete = challenge.progress >= challenge.target;

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 space-y-2">
                <p className="font-semibold text-primary">{challenge.title}</p>
                <p className="text-xs text-muted-foreground">{challenge.description}</p>
                <div className="flex items-center gap-2">
                    <Progress value={(challenge.progress / challenge.target) * 100} className="h-2 w-full" />
                    <span className="text-xs font-mono text-muted-foreground">{challenge.progress}/{challenge.target}</span>
                </div>
            </div>
            <Button 
                onClick={() => onClaim(challenge.id)}
                disabled={!isComplete || challenge.claimed || isClaiming} 
                size="sm"
            >
                {isClaiming ? <Loader2 className="animate-spin" /> : challenge.claimed ? <Check /> : <><Coins className="mr-1 h-3 w-3" /> {challenge.reward}</>}
            </Button>
        </div>
    )
}

const gameTips = [
    "Drag plants from your collection onto the pots in your room to display them.",
    "Water your plants to gain XP and level them up. Evolve them at level 10!",
    "Complete daily challenges to earn extra gold.",
    "Visit the shop to get daily free draws or buy more with your gold.",
    "Show off your favorite plants on the community page by selecting them in your profile."
];

export default function HomePage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();

  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);
  const [isClaimingChallenge, setIsClaimingChallenge] = useState(false);

  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  useEffect(() => {
    if (user) {
        refillDraws(user.uid);
        checkAndResetChallenges(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (gameData?.plants) {
        const allPlants = Object.values(gameData.plants);
        if (allPlants.length > 0) {
          const latest = allPlants.reduce((latest, plant) => (plant.id > latest.id ? plant : latest), allPlants[0]);
          setLatestPlant(latest);
        } else {
          setLatestPlant(null);
        }
    }
  }, [gameData]);

  const handleDraw = async () => {
    if (!gameData || gameData.draws <= 0) {
        toast({
            variant: "destructive",
            title: "No Draws Left",
            description: "Visit the shop to get more draws or wait for your daily refill.",
        });
        return;
    }
    if (!user) return;

    setIsDrawing(true);
    try {
        await useDraw(user.uid);

        const existingNames = gameData.plants ? Object.values(gameData.plants).map(p => p.name) : [];
        const drawnPlantResult = await drawPlantAction(existingNames);
        const compressedImageDataUri = await compressImage(drawnPlantResult.imageDataUri);
        
        playSfx('success');
        setDrawnPlant({
            ...drawnPlantResult,
            imageDataUri: compressedImageDataUri,
        });

    } catch (e: any) {
        console.error(e);
        if (e.message === 'Invalid API Key') {
            toast({
                variant: "destructive",
                title: "Invalid API Key",
                description: "Please check your GOOGLE_API_KEY in the .env file.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Failed to draw a plant",
                description: "There was an issue with the AI. Please try again.",
            });
        }
    } finally {
        setIsDrawing(false);
    }
  };

  const handleCollect = async () => {
    if (!drawnPlant || !user) return;

    try {
        const plainDrawnPlant = JSON.parse(JSON.stringify(drawnPlant));
        const newPlant = await savePlant(user.uid, plainDrawnPlant);
        setLatestPlant(newPlant);
        await updateCollectionProgress(user.uid);
    } catch (e) {
        console.error("Failed to save plant to Firestore", e);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your new plant.",
        });
    }
    
    setDrawnPlant(null);
  };
  
  const handleClaimChallenge = async (challengeId: string) => {
    if (!user) return;
    setIsClaimingChallenge(true);
    try {
        await claimChallengeReward(user.uid, challengeId);
        playSfx('reward');
        toast({
            title: "Reward Claimed!",
            description: "You've earned some gold!",
        });
    } catch (e: any) {
        console.error("Failed to claim challenge reward", e);
        toast({
            variant: "destructive",
            title: "Claiming Error",
            description: e.message || "Could not claim your reward.",
        });
    } finally {
        setIsClaimingChallenge(false);
    }
  };
  
  if (!user || !gameData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userChallenges = gameData.challenges;

  return (
    <div className="p-4 space-y-6 bg-white">
      <header className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl text-primary font-bold text-center">
          Plenty Of Plants
        </h1>
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </Button>
        </div>
      </header>

      <main className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center">Your Latest Plant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[260px]">
            {latestPlant ? (
              <Link href="/room" className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
                <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
                  {latestPlant.image !== 'placeholder' ? (
                      <Image
                        src={latestPlant.image}
                        alt={latestPlant.name}
                        width={192}
                        height={192}
                        className="object-cover w-full h-full"
                        data-ai-hint={latestPlant.hint}
                      />
                  ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Leaf className="w-16 h-16 text-muted-foreground" />
                      </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-primary">{latestPlant.name}</h3>
                <div className="w-4/5">
                    <Progress value={(latestPlant.xp / 1000) * 100} className="h-2" />
                </div>
              </Link>
            ) : (
              <p className="text-muted-foreground">
                No plants collected yet. Time to draw one!
              </p>
            )}
          </CardContent>
        </Card>
        
        {userChallenges && (
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="text-yellow-500" />
                        Daily Challenges
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {Object.values(challenges).map(challengeDef => {
                       const userChallengeData = userChallenges[challengeDef.id] || { progress: 0, claimed: false };
                       const fullChallengeData = { ...challengeDef, ...userChallengeData };
                       return <ChallengeCard key={challengeDef.id} challenge={fullChallengeData} onClaim={handleClaimChallenge} isClaiming={isClaimingChallenge} />
                   })}
                </CardContent>
            </Card>
        )}

        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    {Array.from({ length: MAX_DRAWS }).map((_, index) => {
                        const isAvailable = index < gameData.draws;
                        return (
                            <div key={index} className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-white shadow-inner",
                                isAvailable ? "bg-green-500" : "bg-red-500"
                            )}>
                                {isAvailable ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <X className="h-5 w-5" />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="text-sm text-muted-foreground text-center">
                    <span>Draws Available</span>
                </div>
            </div>
            <Button onClick={handleDraw} disabled={isDrawing || gameData.draws <= 0} size="lg" className="w-full rounded-full mt-2">
              {isDrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drawing...
                </>
              ) : (
                'Draw New Plant'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="text-primary" />
                    Game Tips
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Carousel
                  plugins={[autoplayPlugin.current]}
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                  onMouseEnter={() => autoplayPlugin.current.stop()}
                  onMouseLeave={() => autoplayPlugin.current.reset()}
                >
                  <CarouselContent>
                    {gameTips.map((tip, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1 h-12 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground text-center">{tip}</p>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
            </CardContent>
        </Card>
      </main>
      
      <NewPlantDialog
        plant={drawnPlant}
        open={!!drawnPlant}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCollect();
          }
        }}
      />
    </div>
  );
}
