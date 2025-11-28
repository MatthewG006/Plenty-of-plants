'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/context/AuthContext';
import { challenges, secondaryChallenges, checkAndResetChallenges, claimChallengeReward, type Challenge } from '@/lib/challenge-manager';
import { Award, Coins, Sparkles, CheckCircle } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

function ChallengeItem({ challenge, onClaim }: { challenge: Challenge, onClaim: (id: string) => void }) {
    const isComplete = challenge.progress >= challenge.target;
    return (
        <div key={challenge.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex-grow flex flex-col items-start gap-1">
                <p className="font-semibold text-primary">{challenge.title}</p>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
                <div className="w-full flex items-center gap-2 mt-1">
                    <Progress value={(challenge.progress / challenge.target) * 100} className="flex-1 h-2" />
                    <p className="text-xs text-muted-foreground font-mono"> {Math.min(challenge.progress, challenge.target)}/{challenge.target}</p>
                </div>
            </div>
            <Button
                size="sm"
                disabled={!isComplete || challenge.claimed}
                onClick={() => onClaim(challenge.id)}
                className="ml-4 w-24 shrink-0"
            >
                {challenge.claimed ? (
                    <span className="flex items-center gap-1.5"><CheckCircle />Claimed</span>
                ) : isComplete ? (
                    <span className="flex items-center gap-1.5"><Coins />{challenge.reward}</span>
                ) : (
                     <span className="flex items-center gap-1.5 opacity-70"><Coins />{challenge.reward}</span>
                )}
            </Button>
        </div>
    );
}

export default function ChallengeList() {
    const { user, gameData } = useAuth();
    const { playSfx } = useAudio();
    const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
    const [bonusChallenges, setBonusChallenges] = useState<Challenge[]>([]);
    const [showBonus, setShowBonus] = useState(false);

    useEffect(() => {
        if (!user || !gameData) return;

        const populateChallenges = async () => {
            await checkAndResetChallenges(user.uid);
            
            const populatedDaily = Object.values(challenges).map(challengeDef => {
                const userProgress = gameData.challenges?.[challengeDef.id] || { progress: 0, claimed: false };
                return { ...challengeDef, ...userProgress };
            });
            setDailyChallenges(populatedDaily);
            
            const populatedBonus = Object.values(secondaryChallenges).map(challengeDef => {
                const userProgress = gameData.challenges?.[challengeDef.id] || { progress: 0, claimed: false };
                return { ...challengeDef, ...userProgress };
            });
            setBonusChallenges(populatedBonus);

            const allDailyClaimed = populatedDaily.every(c => c.claimed);
            setShowBonus(allDailyClaimed);
        };

        populateChallenges();
    }, [user, gameData]);

    const handleClaim = async (challengeId: string) => {
        if (!user) return;
        try {
            await claimChallengeReward(user.uid, challengeId);
            playSfx('reward');
            // Optimistically update the UI
            const updateList = (list: Challenge[]) => list.map(c => c.id === challengeId ? { ...c, claimed: true } : c);
            const newDailies = updateList(dailyChallenges);
            const newBonuses = updateList(bonusChallenges);
            setDailyChallenges(newDailies);
            setBonusChallenges(newBonuses);

            // Check if it's time to show bonus challenges
            if (newDailies.every(c => c.claimed)) {
                setShowBonus(true);
            }
        } catch (error) {
            console.error("Failed to claim reward:", error);
        }
    };

    const currentChallenges = showBonus ? bonusChallenges : dailyChallenges;
    const currentTitle = showBonus ? "Bonus Challenges" : "Daily Challenges";
    const currentIcon = showBonus ? <Sparkles className="h-6 w-6 text-pink-500 mr-2" /> : <Award className="h-6 w-6 text-yellow-500 mr-2" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-semibold flex items-center">
                    {currentIcon}
                    {currentTitle}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                    {currentChallenges.map(challenge => (
                        <ChallengeItem key={challenge.id} challenge={challenge} onClaim={handleClaim} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}