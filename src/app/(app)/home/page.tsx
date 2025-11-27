

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X, Loader2, Leaf, Award, Coins, Info, Clock, Users, Sprout, Gift, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { Plant, DrawPlantOutput } from '@/interfaces/plant';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDraw, MAX_DRAWS, refillDraws, refundDraw } from '@/lib/draw-manager';
import { useAudio } from '@/context/AudioContext';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { savePlant, claimLoginReward } from '@/lib/firestore';
import { compressImage } from '@/lib/image-compression';
import { Challenge, challenges, secondaryChallenges, claimChallengeReward, checkAndResetChallenges, updateCollectionProgress, updateLoginProgress } from '@/lib/challenge-manager';
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useRouter } from 'next/navigation';
import { drawPlantAction } from '@/app/actions/draw-plant';
import { NewPlantDialog } from '@/components/plant-dialogs';


const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours


const loginRewards = [
    { day: 1, type: 'gold', amount: 10, icon: Coins },
    { day: 2, type: 'glitterCount', amount: 1, icon: Sparkles },
    { day: 3, type: 'gold', amount: 20, icon: Coins },
    { day: 4, type: 'sheenCount', amount: 1, icon: Star },
    { day: 5, type: 'gold', amount: 30, icon: Coins },
    { day: 6, type: 'rainbowGlitterCount', amount: 1, icon: Sparkles },
    { day: 7, type: 'draws', amount: 1, icon: Gift },
];

function isYesterday(timestamp: number): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const someDate = new Date(timestamp);
    return someDate.getDate() === yesterday.getDate() &&
           someDate.getMonth() === yesterday.getMonth() &&
           someDate.getFullYear() === yesterday.getFullYear();
}

function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}


function LoginRewardDialog({ open, onOpenChange, onClaim, streakDay, claimedToday }: { open: boolean, onOpenChange: (open: boolean) => void, onClaim: () => void, streakDay: number, claimedToday: boolean }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto bg-accent rounded-full p-3 mb-2">
                        <Gift className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <DialogTitle className="text-2xl text-center">Daily Login Bonus</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Log in every day to earn rewards! Your current streak is {streakDay} day(s).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-2 py-4">
                    {loginRewards.map((reward, index) => {
                        const day = index + 1;
                        const isClaimed = day <= streakDay;
                        const isToday = day === streakDay + 1;
                        return (
                            <div key={day} className={cn("flex flex-col items-center justify-center p-2 rounded-lg text-center aspect-square", isClaimed ? "bg-muted text-muted-foreground" : "bg-card", isToday && !claimedToday && "shadow-[0_0_15px_3px] shadow-yellow-400/80 border-2 border-yellow-400")}>
                                <p className="text-xs font-bold">Day {day}</p>
                                <reward.icon className={cn("w-6 h-6 my-1", isClaimed ? "text-muted-foreground" : "text-primary")} />
                                <p className="text-xs">{reward.amount} {reward.type === 'gold' ? 'Gold' : reward.type === 'draws' ? 'Draw' : 'Pack'}</p>
                            </div>
                        )
                    })}
                </div>
                 <DialogFooter>
                    <Button onClick={onClaim} disabled={claimedToday} className="w-full">
                        {claimedToday ? "Claimed for Today" : "Claim Reward"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function getNextDrawTimeString(lastRefill: number) {
    const now = Date.now();
    const nextRefillTime = lastRefill + REFILL_INTERVAL;
    const diff = Math.max(0, nextRefillTime - now);
    
    if (diff === 0) return 'Next draw available now!';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m until next draw`;
}

function CommunityInfoDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  const handleGoToProfile = () => {
    router.push('/profile');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto bg-accent rounded-full p-3 mb-2">
            <Users className="h-8 w-8 text-accent-foreground" />
          </div>
          <DialogTitle className="text-2xl text-center">New: The Community Page!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Check out the new Community page to see what other players are growing. You can like their showcases to give them 5 gold!
            <br /><br />
            Go to your Profile to select which of your own plants you want to show off.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleGoToProfile}>
            Go to Profile
          </Button>
          <DialogClose asChild>
            <Button>Got it!</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GameChangesInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto bg-accent rounded-full p-3 mb-2">
            <Award className="h-8 w-8 text-accent-foreground" />
          </div>
          <DialogTitle className="text-2xl text-center">New Game Updates!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Keep the streak going! After you complete all your daily challenges, a new set of **Bonus Challenges** will now appear.
            <br/><br/>
            Complete them for even more rewards!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">Awesome!</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GardenInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  const handleGoToGarden = () => {
    router.push('/garden');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto bg-accent rounded-full p-3 mb-2">
            <Sprout className="h-8 w-8 text-accent-foreground" />
          </div>
          <DialogTitle className="text-2xl text-center">Watering Has Moved!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            All your plant care, including watering and evolution, now happens in the new **Garden** page. Visit your garden to help your plants grow!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleGoToGarden}>
            Go to Garden
          </Button>
          <DialogClose asChild>
            <Button>Got it!</Button>
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
    "Go to the Garden to water your plants and help them grow.",
    "Drag plants from your collection onto the plots in your garden to display them.",
    "Complete daily challenges to earn extra gold.",
    "Visit the shop to get daily free draws or buy more with your gold.",
    "Show off your favorite plants on the community page by selecting them in your profile."
];

export default function HomePage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  const router = useRouter();

  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);
  const [isClaimingChallenge, setIsClaimingChallenge] = useState(false);
  const [nextDrawTime, setNextDrawTime] = useState('');
  const [showCommunityInfo, setShowCommunityInfo] = useState(false);
  const [showGameChangesInfo, setShowGameChangesInfo] = useState(false);
  const [showGardenInfo, setShowGardenInfo] = useState(false);
  const [showLoginReward, setShowLoginReward] = useState(false);

  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  useEffect(() => {
    if (user && gameData) {
        refillDraws(user.uid).then(drawsAdded => {
            if (drawsAdded > 0) {
                 toast({
                    title: "Draws Refilled!",
                    description: `You got ${drawsAdded} new draw(s).`,
                });
            }
        });
        
        checkAndResetChallenges(user.uid).then(() => {
            updateLoginProgress(user.uid);
        });

        const hasSeenCommunityInfo = localStorage.getItem('hasSeenCommunityInfo');
        if (!hasSeenCommunityInfo) {
          setShowCommunityInfo(true);
        }

        const hasSeenGameChangesInfo = localStorage.getItem('hasSeenGameChangesInfo_v1');
        if (!hasSeenGameChangesInfo) {
            setShowGameChangesInfo(true);
        }
        
        const hasSeenGardenInfo = localStorage.getItem('hasSeenGardenInfo_v1');
        if (!hasSeenGardenInfo) {
            setShowGardenInfo(true);
        }
        
        const lastClaimed = gameData.lastLoginBonusClaimed || 0;
        if (!isToday(lastClaimed)) {
            setShowLoginReward(true);
        }
    }
  }, [user, gameData, toast]);

  const handleCloseCommunityInfo = (isOpen: boolean) => {
    if (!isOpen) {
      localStorage.setItem('hasSeenCommunityInfo', 'true');
      setShowCommunityInfo(false);
    }
  }

  const handleCloseGameChangesInfo = (isOpen: boolean) => {
      if (!isOpen) {
          localStorage.setItem('hasSeenGameChangesInfo_v1', 'true');
          setShowGameChangesInfo(false);
      }
  }
  
  const handleCloseGardenInfo = (isOpen: boolean) => {
      if (!isOpen) {
          localStorage.setItem('hasSeenGardenInfo_v1', 'true');
          setShowGardenInfo(false);
      }
  }

  useEffect(() => {
    if (gameData?.plants) {
        const allPlants = Object.values(gameData.plants) as Plant[];
        if (allPlants.length > 0) {
          const latest = allPlants.reduce((latest, plant) => (plant.id > latest.id ? plant : latest));
          setLatestPlant(latest);
        } else {
          setLatestPlant(null);
        }
    }
  }, [gameData]);

  useEffect(() => {
    if (gameData?.lastDrawRefill) {
      const updateTimer = () => {
        setNextDrawTime(getNextDrawTimeString(gameData.lastDrawRefill));
      };

      updateTimer();
      const timer = setInterval(updateTimer, 60000); 

      return () => clearInterval(timer);
    }
  }, [gameData?.lastDrawRefill]);

  const handleDraw = async () => {
    if (!user || !gameData) return;

    if (gameData.draws <= 0) {
      toast({
        variant: 'destructive',
        title: 'No Draws Left',
        description: 'Visit the shop to get more draws or wait for your daily refill.',
      });
      return;
    }

    setIsDrawing(true);
    try {
      await useDraw(user.uid);
      playSfx('success');
      
      const existingImageFilenames = gameData.plants ? Object.values(gameData.plants).map(p => p.hint) : [];
      
      const drawnPlantResult = await drawPlantAction(existingImageFilenames);
      
      setDrawnPlant(drawnPlantResult);

    } catch (e: any) {
      console.error("Error during handleDraw:", e);
      await refundDraw(user.uid);
      toast({
        variant: 'destructive',
        title: 'Failed to draw a plant',
        description: e.message || 'An unexpected error occurred. Your draw has been refunded.',
      });
    } finally {
      setIsDrawing(false);
    }
  };

  const handleCollect = async () => {
    if (!drawnPlant || !user) return;
    
    try {
        const compressedImageDataUri = await compressImage(drawnPlant.imageDataUri);
        
        const newPlant = await savePlant(user.uid, { ...drawnPlant, imageDataUri: compressedImageDataUri });
        
        setLatestPlant(newPlant);
        await updateCollectionProgress(user.uid);

    } catch (e: any) {
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
  
  const handleClaimLoginReward = async () => {
    if (!user || !gameData) return;

    const lastClaimed = gameData.lastLoginBonusClaimed || 0;
    if (isToday(lastClaimed)) {
        toast({ title: "Already Claimed", description: "You've already claimed your login bonus for today." });
        return;
    }
    
    let currentStreak = gameData.loginStreak || 0;
    if (!isYesterday(lastClaimed)) {
        currentStreak = 0; // Reset streak if they missed a day
    }
    
    const rewardIndex = currentStreak % loginRewards.length;
    const reward = loginRewards[rewardIndex];

    try {
        await claimLoginReward(user.uid, currentStreak + 1, reward);
        playSfx('success');
        toast({
            title: `Day ${currentStreak + 1} Reward Claimed!`,
            description: `You got ${reward.amount} ${reward.type === 'gold' ? 'Gold' : reward.type === 'draws' ? 'Draw(s)' : 'Pack(s)'}!`,
        });
        setShowLoginReward(false);
    } catch (e: any) {
        console.error("Failed to claim login reward", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not claim login reward.' });
    }
};

  const arePrimaryChallengesComplete = useMemo(() => {
      if (!gameData?.challenges) return false;
      return Object.values(challenges).every(challengeDef => {
          const userChallenge = gameData.challenges[challengeDef.id];
          return userChallenge?.claimed || (userChallenge?.progress || 0) >= challengeDef.target;
      });
  }, [gameData?.challenges]);

  const currentChallenges = arePrimaryChallengesComplete ? secondaryChallenges : challenges;

  if (!user || !gameData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userChallenges = gameData.challenges;

  const lastClaimed = gameData.lastLoginBonusClaimed || 0;
  const claimedToday = isToday(lastClaimed);
  let currentStreak = gameData.loginStreak || 0;
  if (!isYesterday(lastClaimed) && !isToday(lastClaimed) && currentStreak > 0) {
      currentStreak = 0; // Show that streak is reset if they missed more than a day
  }

  return (
    <>
      <div className="p-4 space-y-6 bg-white pb-[3.75rem]">
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
                <Link href="/garden" className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
                  <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
                    {latestPlant.image !== 'placeholder' ? (
                        <Image
                          src={latestPlant.image}
                          alt={latestPlant.name}
                          width={192}
                          height={192}
                          className="object-cover w-full h-full"
                          data-ai-hint={latestPlant.hint}
   priority
   unoptimized
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
                          {arePrimaryChallengesComplete ? "Bonus Challenges" : "Daily Challenges"}
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     {Object.values(currentChallenges).map(challengeDef => {
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
                       {gameData.draws < MAX_DRAWS && nextDrawTime && (
                          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                              <Clock className="w-3 h-3" />
                              <span>{nextDrawTime}</span>
                          </div>
                      )}
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
                          <div className="p-1 h-16 flex items-center justify-center">
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

        <CommunityInfoDialog open={showCommunityInfo} onOpenChange={handleCloseCommunityInfo} />
        <GameChangesInfoDialog open={showGameChangesInfo} onOpenChange={handleCloseGameChangesInfo} />
        <GardenInfoDialog open={showGardenInfo} onOpenChange={handleCloseGardenInfo} />
        <LoginRewardDialog 
            open={showLoginReward}
            onOpenChange={setShowLoginReward}
            onClaim={handleClaimLoginReward}
            streakDay={currentStreak}
            claimedToday={claimedToday}
        />
      </div>
      <footer className="text-center text-xs text-muted-foreground pb-2">
        <p>&copy; 2025 Sky Mountain Graphics. All Rights Reserved.</p>
      </footer>
    </>
  );
}
