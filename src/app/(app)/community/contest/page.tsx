
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Crown, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Plant } from '@/interfaces/plant';
import { useAuth } from '@/context/AuthContext';
import { findOrCreateContestSession } from '@/lib/contest-manager';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db, awardContestPrize } from '@/lib/firestore';
import type { ContestSession, ContestPlayer } from '@/lib/contest-manager';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';

const MAX_PLAYERS = 1;

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
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [hasVoted, setHasVoted] = useState(false);
    const [isSelectingPlant, setIsSelectingPlant] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        setIsLoading(true);
        const sessionDocRef = doc(db, 'contestSessions', sessionId);
        const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data() as ContestSession;
                setSession(sessionData);

                const userVote = sessionData.playerVotes && user ? sessionData.playerVotes[user.uid] : undefined;
                setHasVoted(!!userVote);

                setIsLoading(false);
            } else {
                console.error("Contest session not found!");
                toast({ variant: 'destructive', title: 'Session Error', description: 'The contest session could not be found.' });
                setSessionId(null);
                setSession(null);
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [sessionId, toast, user]);

    useEffect(() => {
        if (session?.status !== 'countdown') {
            setCountdown(5); // Reset countdown if status changes
            return;
        }
        
        if (countdown <= 0) return;

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        if (countdown === 1 && user && session.players[0].uid === user.uid) {
            setTimeout(() => {
                const sessionDocRef = doc(db, 'contestSessions', session.id);
                updateDoc(sessionDocRef, { status: 'voting' });
            }, 1000);
        }

        return () => clearTimeout(timer);
    }, [session, countdown, user]);

    useEffect(() => {
        if (session?.status === 'voting' && user && session.players[0].uid === user.uid) {
            const totalVotes = Object.keys(session.playerVotes || {}).length;
            if (totalVotes >= session.players.length) {
                const voteCounts = session.votes || {};
                let winnerId: number | null = null;
                let maxVotes = -1;

                for (const plantId in voteCounts) {
                    if (voteCounts[plantId] > maxVotes) {
                        maxVotes = voteCounts[plantId];
                        winnerId = parseInt(plantId, 10);
                    }
                }

                if (winnerId) {
                    const winnerPlayer = session.players.find(p => p.plant.id === winnerId);
                    if (winnerPlayer) {
                        awardContestPrize(winnerPlayer.uid).then(() => {
                            console.log(`Prize awarded to ${winnerPlayer.username}`);
                        }).catch(e => console.error("Failed to award prize", e));
                    }
                }
                
                const sessionDocRef = doc(db, 'contestSessions', session.id);
                updateDoc(sessionDocRef, {
                    status: 'finished',
                    winnerId: winnerId,
                });
            }
        }
    }, [session, user]);

    const handleSelectPlant = async (plant: Plant) => {
        if (!user || !gameData) return;
        
        setIsSelectingPlant(false);
        setIsJoining(true);

        try {
            const id = await findOrCreateContestSession(
                user.uid,
                user.displayName || 'Player',
                (gameData as any).avatarColor || '#ffffff',
                plant
            );
            setSessionId(id);
        } catch (error) {
            console.error('Error joining contest session:', error);
            toast({
                variant: 'destructive',
                title: 'Error Joining Contest',
                description: 'Could not join a session. Please try again.',
            });
        } finally {
            setIsJoining(false);
        }
    };
    
    const handleJoinClick = () => {
        if (!gameData || !Object.values(gameData.plants).length) {
             toast({
                variant: 'destructive',
                title: 'No Plant Found',
                description: 'You need at least one plant to enter a contest.',
            });
            return;
        }
        setIsSelectingPlant(true);
    }

    const handleVote = async (plantId: number) => {
        if (session?.status !== 'voting' || !sessionId || !user || hasVoted) return;
        
        setHasVoted(true); // Optimistic update
        const sessionDocRef = doc(db, 'contestSessions', sessionId);
        await updateDoc(sessionDocRef, {
          [`votes.${plantId}`]: increment(1),
          [`playerVotes.${user.uid}`]: true
        });
    };
    
    const contestants = session ? session.players : [];
    const status = session ? session.status : 'waiting';
    const isJoined = session && user ? session.players.some(p => p.uid === user.uid) : false;

    const allPlants = gameData ? Object.values(gameData.plants) : [];

  return (
    <>
    <div
      className="min-h-screen bg-cover bg-bottom flex flex-col items-center justify-between text-white p-4 relative"
      style={{ backgroundImage: "url('/contest.png')" }}
    >
        <div className="absolute inset-0 bg-black/50" />
      
        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center gap-4 mt-16">
            <div className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm">
                <h1 className="text-4xl font-bold mb-2">Plant Beauty Contest</h1>
                <p className="text-lg">Join a session and vote for the best-looking plant! The winner gets 50 gold and a special Red Glitter pack!</p>
            </div>
            {status === 'waiting' && !isJoined && (
                <Button onClick={handleJoinClick} disabled={isJoining}>
                    {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Join Contest"}
                </Button>
            )}
            {status === 'waiting' && isJoined && (
                 <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for players... ({contestants.length}/{MAX_PLAYERS})
                </Button>
            )}
            {status === 'countdown' && <p className="text-5xl font-bold animate-pulse">{countdown}</p>}
            {status === 'voting' && <p className="text-2xl font-bold">Vote for your favorite plant!</p>}
            {status === 'finished' && <p className="text-2xl font-bold">The winner has been chosen!</p>}
        </div>

        <div className="w-full h-1/2 absolute bottom-0 left-0 flex items-end justify-center pointer-events-none">
            <div className="grid grid-cols-3 gap-8 w-full max-w-3xl mb-[5%]">
                {contestants.map((player) => {
                    const plant = player.plant;
                    const isWinner = session?.winnerId === plant.id;
                    return (
                        <div key={plant.id} className="relative flex flex-col items-center justify-end">
                            <div className={cn("relative w-32 h-32 sm:w-48 sm:h-48 transition-all duration-500", isWinner && "scale-125")}>
                                {isWinner && <div className="absolute inset-0 bg-yellow-400/50 rounded-full animate-pulse blur-2xl" />}
                                <Image src={plant.image} alt={plant.name} fill className="object-contain" data-ai-hint={plant.hint} />
                                {plant.hasGlitter && <GlitterAnimation />}
                                {plant.hasRedGlitter && <RedGlitterAnimation />}
                                {plant.hasSheen && <SheenAnimation />}
                                {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                            </div>
                            <div className="text-center mt-2 bg-black/50 px-3 py-1 rounded-md">
                                <p className="font-bold text-sm sm:text-base truncate">{player.username}'s {plant.name}</p>
                                {isWinner && <Crown className="w-6 h-6 text-yellow-400 mx-auto mt-1" />}
                            </div>
                            {status === 'voting' && (
                                <Button size="sm" className="mt-2 pointer-events-auto" onClick={() => handleVote(plant.id)} disabled={hasVoted}>
                                    {hasVoted ? 'Voted' : 'Vote'}
                                </Button>
                            )}
                        </div>
                    )
                })}
                {Array.from({ length: MAX_PLAYERS - contestants.length }).map((_, index) => (
                    <div key={`placeholder-${index}`} className="relative flex flex-col items-center justify-end">
                        <div className="relative w-32 h-32 sm:w-48 sm:h-48">
                            <div className="w-full h-full bg-black/20 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        </div>
                        <div className="text-center mt-2 bg-black/50 px-3 py-1 rounded-md">
                            <p className="font-bold text-sm sm:text-base">Waiting...</p>
                        </div>
                    </div>
                ))}
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
