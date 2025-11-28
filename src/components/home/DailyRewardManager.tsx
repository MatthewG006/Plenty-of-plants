
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
import { Award, Coins, Gift, Loader2 } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { useToast } from '@/hooks/use-toast';

const LOGIN_REWARDS = [
    { day: 1, type: 'gold', amount: 10 },
    { day: 2, type: 'gold', amount: 15 },
    { day: 3, type: 'draws', amount: 1 },
    { day: 4, type: 'gold', amount: 25 },
    { day: 5, type: 'glitterCount', amount: 1 },
    { day: 6, type: 'gold', amount: 50 },
    { day: 7, type: 'draws', amount: 2 },
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
    const today = new Date();
    const yesterday = new Date(today.setDate(today.getDate() - 1));
    const someDate = new Date(timestamp);
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

  useEffect(() => {
    if (user && gameData) {
        const lastClaimed = gameData.lastLoginBonusClaimed || 0;
        
        if (!isToday(lastClaimed)) {
            setIsEligible(true);
            const wasYesterday = isYesterday(lastClaimed);
            setCurrentStreak(wasYesterday ? gameData.loginStreak : 0);
        } else {
            setIsEligible(false);
        }
    }
  }, [user, gameData]);

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
        toast({
            title: `Day ${newStreak} Reward Claimed!`,
            description: `You received ${reward.amount} ${reward.type === 'draws' ? 'draw(s)' : 'gold'}!`,
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
  
  if (!isEligible) {
    return null;
  }
  
  const rewardIndex = currentStreak % LOGIN_REWARDS.length;
  const reward = LOGIN_REWARDS[rewardIndex];
  const Icon = reward.type === 'draws' ? Gift : Coins;

  return (
    <AlertDialog open={isEligible} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">Daily Login Reward!</AlertDialogTitle>
          <AlertDialogDescription className="text-center pt-2">
            Welcome back! Your login streak is <span className="font-bold text-primary">{currentStreak + 1} day(s)</span>.
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-center gap-4">
                <Icon className="w-8 h-8 text-yellow-500" />
                <div className="text-left">
                    <p className="font-semibold text-foreground">Today's Reward:</p>
                    <p className="text-lg font-bold text-primary">{reward.amount} {reward.type === 'draws' ? 'Draw(s)' : 'Gold'}</p>
                </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClaimReward} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Claim Reward'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
