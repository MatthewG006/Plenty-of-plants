'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/context/AuthContext';
import { getUserGameData } from '@/lib/firestore';
import { challenges, secondaryChallenges, checkAndResetChallenges, claimChallengeReward, type Challenge } from '@/lib/challenge-manager';
import { Award, Coins } from 'lucide-react';

export default function ChallengeList() {
    const { user } = useAuth();
    const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchChallenges = async () => {
            await checkAndResetChallenges(user.uid);
            const gameData = await getUserGameData(user.uid);
            if (!gameData) return;

            const allChallenges = { ...challenges, ...secondaryChallenges };
            const populatedChallenges = Object.values(allChallenges).map(challengeDef => {
                const userProgress = gameData.challenges?.[challengeDef.id] || { progress: 0, claimed: false };
                return {
                    ...challengeDef,
                    progress: userProgress.progress,
                    claimed: userProgress.claimed,
                };
            });

            setUserChallenges(populatedChallenges);
        };

        fetchChallenges();
    }, [user]);

    const handleClaim = async (challengeId: string) => {
        if (!user) return;
        try {
            await claimChallengeReward(user.uid, challengeId);
            setUserChallenges(prevChallenges =>
                prevChallenges.map(c =>
                    c.id === challengeId ? { ...c, claimed: true } : c
                )
            );
        } catch (error) {
            console.error("Failed to claim reward:", error);
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Award className="h-6 w-6 text-yellow-500 mr-2" />
                    Daily Challenges
                </h2>
                <div className="space-y-4">
                    {userChallenges.map(challenge => (
                        <div key={challenge.id} className="flex items-center justify-between p-4 bg-gray-100 bg-opacity-50 rounded-md">
                            <div className="flex-grow flex flex-col items-start">
                                <p className="font-semibold">{challenge.title}</p>
                                <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                <div className="w-full flex items-center">
                                    <Progress value={(challenge.progress / challenge.target) * 100} className="flex-1 h-2 bg-green-200 mt-1" />
                                    <p className="text-sm text-muted-foreground ml-2"> {challenge.progress} / {challenge.target}</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                disabled={challenge.progress < challenge.target || challenge.claimed}
                                onClick={() => handleClaim(challenge.id)}
                                className="ml-4"
                            >
                                <span className="flex items-center">
                                    <Coins className="h-4 w-4 text-white mr-1" />
                                    {challenge.reward}
                                </span>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
