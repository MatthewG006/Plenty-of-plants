
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { claimLoginReward } from '@/lib/firestore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Award, Coins, Gift, Loader2, Sparkles, Star, X } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOGIN_REWARDS = [
    { day: 1, type: 'gold', amount: 10, icon: Coins },
    { day: 2, type: 'glitterCount', amount: 1, icon: Sparkles, label: '1 Pack' },
    { day: 3, type: 'gold', amount: 20, icon: Coins },
    { day: 4, type: 'sheenCount', amount: 1, icon: Star, label: '1 Pack' },
    { day: 5, type: 'gold', amount: 30, icon: Coins },
    { day: 6, type: 'rainbowGlitterCount', amount: 1, icon: Sparkles, label: '1 Pack' },
    { day: 7, type: 'draws', amount: 1, icon: Gift },
];

function isToday(timestamp: number): boolean {
    if (!timestamp) return false;
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}

function isYesterday(timestamp: number): boolean {
    if (!timestamp) return false;
    const someDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));
    return someDate.getDate() === yesterday.getDate() &&
           someDate.getMonth() === yesterday.getMonth() &&
           someDate.getFullYear() === yesterday.getFullYear();
}

export default function DailyRewardManager() {
  const { user, gameData } = useAuth();
  const { playSfx } = useAudio();
  const { toast } = useToast();
  
  const [isEligible, setIsEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [hasBeenShownThisSession, setHasBeenShownThisSession] = useState(false);

  useEffect(() => {
    if (user && gameData && !hasBeenShownThisSession) {
        const lastClaimed = gameData.lastLoginBonusClaimed || 0;
        
        if (!isToday(lastClaimed)) {
            setIsEligible(true);
            setHasBeenShownThisSession(true); // Mark as shown for this session
            const wasYesterday = isYesterday(lastClaimed);
            setCurrentStreak(wasYesterday ? (gameData.loginStreak || 0) : 0);
        } else {
            setIsEligible(false);
        }
    }
  }, [user, gameData, hasBeenShownThisSession]);

  const handleClaimReward = async () => {
    if (!user) return;
    setIsLoading(true);
    playSfx('tap');

    const newStreak = currentStreak + 1;
    const rewardIndex = (newStreak - 1) % LOGIN_REWARDS.length;
    const reward = LOGIN_REWARDS[rewardIndex];

    try {
        await claimLoginReward(user.uid, newStreak, reward);
        playSfx('reward');
        let rewardLabel = '';
        if (reward.label) {
            rewardLabel = reward.label;
        } else {
            rewardLabel = `${reward.amount} ${reward.type === 'draws' ? 'draw(s)' : 'gold'}`;
        }

        toast({
            title: `Day ${newStreak} Reward Claimed!`,
            description: `You received ${rewardLabel}!`,
        });
        setIsEligible(false); // Close dialog and prevent re-opening
    } catch (error: any) {
        console.error('Failed to claim reward:', error);
        toast({
            variant: 'destructive',
            title: 'Claim Error',
            description: error.message || 'Could not claim your reward. Please try again.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsEligible(false);
    playSfx('tap');
  };
  
  if (!isEligible) {
    return null;
  }
  
  const rewardDayIndex = currentStreak % LOGIN_REWARDS.length;

  return (
    <AlertDialog open={isEligible} onOpenChange={setIsEligible}>
      <AlertDialogContent>
        <button onClick={handleClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </button>
        <AlertDialogHeader className="items-center text-center">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-2xl">Daily Login Bonus</AlertDialogTitle>
          <AlertDialogDescription>
            Log in every day to earn rewards! Your current streak is {currentStreak} day(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-4 gap-2 text-center">
            {LOGIN_REWARDS.map((reward, index) => {
                const Icon = reward.icon;
                const isCurrentDay = index === rewardDayIndex;
                let rewardText = reward.label || `${reward.amount} ${reward.type === 'draws' ? 'Draw' : 'Gold'}`;
                
                return (
                    <div key={reward.day} className={cn(
                        "p-2 rounded-lg border-2",
                        isCurrentDay ? "border-yellow-400 bg-yellow-100/50 shadow-md" : "border-transparent bg-muted/50"
                    )}>
                        <p className={cn("text-xs font-bold", isCurrentDay ? "text-yellow-600" : "text-muted-foreground")}>Day {reward.day}</p>
                        <Icon className={cn("w-6 h-6 mx-auto my-1", isCurrentDay ? "text-primary" : "text-muted-foreground/70")} />
                        <p className="text-xs font-semibold">{rewardText}</p>
                    </div>
                )
            })}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClaimReward} className="w-full text-lg h-12" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Claim Reward'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
