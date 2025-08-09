
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Crown, Loader2, Sparkles, Trophy } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Plant } from '@/interfaces/plant';
import { useAuth } from '@/context/AuthContext';
import { joinAndGetContestState, voteForPlant } from '@/app/actions/contest-actions';
import { useToast } from '@/hooks/use-toast';
import type { ContestSession } from '@/lib/contest-manager';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';
import { Progress } from '@/components/ui/progress';

function SheenAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
            <div className="absolute -top-1/2 w-1/12 h-[200%] bg-white/30 animate-sheen" />
        </div>
    )
}

function RainbowGlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
                <Sparkles key={i} className="absolute animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    color: `hsl(${Math.random() * 360}, 100%, 70%)`,
                    width: `${5 + Math.random() * 5}px`,
                    height: `${5 + Math.random() * 5}px`,
                }} />
            ))}
        </div>
    );
}

function RedGlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
                <Sparkles key={i} className="absolute text-red-500 animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    width: `${8 + Math.random() * 8}px`,
                    height: `${8 + Math.random() * 8}px`,
                }} />
            ))}
        </div>
    );
}

function GlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
                <Sparkles key={i} className="absolute text-yellow-300 animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    width: `${5 + Math.random() * 5}px`,
                    height: `${5 + Math.random() * 5}px`,
                }} />
            ))}
        </div>
    );
}


export default function ContestPage() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    
    const [session, setSession] = useState<ContestSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [isSelectingPlant, setIsSelectingPlant] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const allPlants = gameData ? Object.values(gameData.plants) : [];
    const hasEntered = user && session?.players[user.uid];
    const hasVoted = user && session?.votes[user.uid];

    const fetchContestState = useCallback(async (plantToEnter?: Plant) => {
        if (!user || !gameData) return;
        
        if (!plantToEnter && !hasEntered) {
            setIsLoading(false);
            setIsJoining(false);
            return;
        }

        try {
            const result = await joinAndGetContestState({
                uid: user.uid,
                username: user.displayName || "Player",
                avatarColor: (gameData as any).avatarColor || '#ffffff',
                plant: plantToEnter,
            });

            if (result.session) {
                setSession(result.session);
            } else if (result.error) {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Error with contest session:', error);
            toast({
                variant: 'destructive',
                title: 'Contest Error',
                description: error.message || 'Could not connect to the contest. Please try again.',
            });
        } finally {
            setIsLoading(false);
            setIsJoining(false);
        }
    }, [user, gameData, toast, hasEntered]);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        fetchContestState();
    }, [fetchContestState]);
    
    // Timer and periodic fetching
    useEffect(() => {
        if (!session) return;
        
        const updateTimer = () => {
            const endTime = new Date(session.endsAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            setTimeLeft(remaining);

            // If time is up and we were in voting, fetch state to get winner
            if (remaining === 0 && session.status === 'voting') {
                fetchContestState();
            }
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        
        // Also fetch every 15 seconds to get new players/votes
        const fetchInterval = setInterval(fetchContestState, 15000);

        return () => {
            clearInterval(interval);
            clearInterval(fetchInterval);
        };

    }, [session, fetchContestState]);


    const handleSelectPlant = async (plant: Plant) => {
        setIsJoining(true);
        setIsSelectingPlant(false);
        await fetchContestState(plant);
    };

    const handleJoinClick = () => {
        if (!allPlants.length) {
             toast({
                variant: 'destructive',
                title: 'No Plant Found',
                description: 'You need at least one plant to enter a contest.',
            });
            return;
        }
        setIsSelectingPlant(true);
    }
    
    const handleVote = async (votedForPlayerUid: string) => {
        if (!user || !session || session.status !== 'voting' || hasVoted) return;

        setIsVoting(true);
        try {
            const result = await voteForPlant({
                sessionId: session.id,
                voterUid: user.uid,
                votedForUid: votedForPlayerUid,
            });
            if (result.session) {
                setSession(result.session);
                toast({ title: "Vote Cast!", description: "Your vote has been counted."});
            } else if (result.error) {
                throw new Error(result.error);
            }
        } catch (error: any) {
             console.error('Error voting:', error);
            toast({
                variant: 'destructive',
                title: 'Vote Error',
                description: error.message || 'Could not cast your vote.',
            });
        } finally {
            setIsVoting(false);
        }
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const progress = session ? (timeLeft / session.duration) * 100 : 0;
    
    const contestants = session ? Object.values(session.players) : [];
    const status = session ? session.status : 'loading';

    const getVoteCount = (playerUid: string) => {
        if (!session) return 0;
        return Object.values(session.votes).filter(vote => vote === playerUid).length;
    };

  return (
    <>
    <div
      className="min-h-screen bg-cover bg-bottom flex flex-col items-center justify-between text-white p-4 relative"
      style={{ backgroundImage: "url('/contest.png')" }}
    >
        <div className="absolute inset-0 bg-black/50" />
      
        <header className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center gap-4 mt-24">
            <div className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm">
                <h1 className="text-4xl font-bold mb-2">Plant Beauty Contest</h1>
                <p className="text-lg">Enter the running contest round and vote for the best plant! The winner gets 50 gold and a special cosmetic pack!</p>
            </div>
            
            {isLoading ? (
                <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Contest...</Button>
            ) : !hasEntered ? (
                 <Button onClick={handleJoinClick} disabled={isJoining}>
                    {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                    Enter Contest
                </Button>
            ) : (
                 <p className="text-xl font-bold text-green-300">You have entered the contest!</p>
            )}

            {session && (
                 <div className="w-full max-w-md p-4 bg-black/50 rounded-lg">
                    <div className="text-center mb-2">
                        <p className="font-bold text-xl">{status === 'voting' ? 'Voting is Live!' : 'Contest in Progress'}</p>
                        <p className="text-2xl font-mono">{`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</p>
                    </div>
                    <Progress value={progress} className="h-2 [&>div]:bg-green-400" />
                 </div>
            )}
             {status === 'finished' && (
                <p className="text-3xl font-bold animate-pulse text-yellow-300">The Winner has been chosen!</p>
            )}

        </header>

        <div className="w-full h-1/2 absolute bottom-0 left-0 flex items-end justify-center pointer-events-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full max-w-5xl mb-[5%]">
                {contestants.map((player) => {
                    const plant = player.plant;
                    const isWinner = session?.winnerId === player.uid;
                    const isSelf = player.uid === user?.uid;

                    return (
                        <div key={player.uid} className="relative flex flex-col items-center justify-end">
                            {isWinner && <div className="absolute inset-0 bg-yellow-400/50 rounded-full animate-pulse blur-2xl -z-10" />}
                             <div className={cn("relative w-32 h-32 sm:w-48 sm:h-48 transition-all duration-500", isWinner && "scale-125")}>
                                <Image src={plant.image} alt={plant.name} fill className="object-contain drop-shadow-lg" data-ai-hint={plant.hint} />
                                {plant.hasGlitter && <GlitterAnimation />}
                                {plant.hasRedGlitter && <RedGlitterAnimation />}
                                {plant.hasSheen && <SheenAnimation />}
                                {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                            </div>
                            <div className="text-center mt-2 bg-black/60 px-3 py-1 rounded-md min-w-[150px]">
                                <p className="font-bold text-sm sm:text-base truncate">{player.username}'s {plant.name}</p>
                                <p className="text-xs text-muted-foreground">Votes: {getVoteCount(player.uid)}</p>
                                {isWinner && <Crown className="w-6 h-6 text-yellow-400 mx-auto mt-1" />}
                            </div>
                            {status === 'voting' && hasEntered && (
                                <Button size="sm" className="mt-2 pointer-events-auto" onClick={() => handleVote(player.uid)} disabled={isVoting || hasVoted || isSelf}>
                                    {isVoting ? <Loader2 className="animate-spin"/> : hasVoted ? 'Voted' : 'Vote'}
                                </Button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

         <div className="absolute top-4 left-4 z-10">
            <Button asChild variant="secondary">
                <Link href="/community/park">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Park
                </Link>
            </Button>
        </div>
    </div>
    <ContestPlantSelectionDialog
        open={isSelectingPlant}
        onOpenChange={setIsSelectingPlant}
        allPlants={allPlants}
        onSelectPlant={handleSelectPlant}
    />
    </>
  );
}

    