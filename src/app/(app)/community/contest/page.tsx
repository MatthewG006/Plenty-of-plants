
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, Users, Star, Crown, Sparkles, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';
import { joinAndGetContestState, voteForContestant, finalizeContest, sendHeartbeat } from '@/app/actions/contest-actions';
import type { ContestSession, Contestant } from '@/lib/firestore';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import confetti from 'canvas-confetti';

const WAITING_TIME = 30; // seconds
const VOTING_TIME = 20; // seconds
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

// Predefined positions for contestants in the lobby view.
const playerPositions = [
  { top: '20%', left: '15%' },
  { top: '20%', left: '65%' },
  { top: '55%', left: '15%' },
  { top: '55%', left: '65%' },
];

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

function ContestantCard({ contestant, onVote, hasVoted, isWinner }: { contestant: Contestant, onVote: (id: number) => void, hasVoted: boolean, isWinner: boolean }) {
    return (
        <Card className={cn(
            "text-center transition-all relative overflow-hidden",
            isWinner && "border-yellow-400 border-2 shadow-yellow-300/50 shadow-lg"
        )}>
            {isWinner && (
                <>
                    <div className="absolute top-2 right-2 text-yellow-400 z-10">
                        <Crown className="w-8 h-8" fill="currentColor" />
                    </div>
                    <GlitterAnimation />
                </>
            )}
            <CardContent className="p-2">
                <div className="aspect-square rounded-md bg-muted/50 mb-2 relative">
                    <Image src={contestant.image} alt={contestant.name} fill sizes="150px" className="object-cover" />
                </div>
                <h3 className="font-bold text-primary truncate">{contestant.name}</h3>
                <p className="text-xs text-muted-foreground truncate">by {contestant.ownerName}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-muted-foreground">
                    <Star className={cn("w-4 h-4", contestant.votes > 0 && "text-yellow-500 fill-current")} />
                    <span className="text-sm font-medium">{contestant.votes}</span>
                </div>
                 <Button onClick={() => onVote(contestant.id)} size="sm" className="w-full mt-2" disabled={hasVoted}>
                    {hasVoted ? "Voted" : "Vote"}
                </Button>
            </CardContent>
        </Card>
    );
}

export default function ContestPage() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<ContestSession | null>(null);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [showPlantSelection, setShowPlantSelection] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    const hasEntered = user && session?.contestants.some(c => c.ownerId === user.uid);
    const hasVoted = user && session?.contestants.some(c => c.voterIds?.includes(user.uid));

    // Heartbeat effect
    useEffect(() => {
        if (user && hasEntered && session?.status === 'waiting') {
            const interval = setInterval(() => {
                sendHeartbeat(user.uid);
            }, HEARTBEAT_INTERVAL);

            // Send an immediate heartbeat on joining
            sendHeartbeat(user.uid);

            return () => clearInterval(interval);
        }
    }, [user, hasEntered, session?.status]);

    useEffect(() => {
        if (!session || session.status === 'finished') return;

        const endTime = new Date(session.expiresAt).getTime();
        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeRemaining(remaining);
        };
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [session]);

    useEffect(() => {
        if (session?.status === 'finished' && session.winner) {
            confetti({
                particleCount: 150,
                spread: 180,
                origin: { y: 0.6 }
            });
        }
    }, [session?.status, session?.winner]);


    useEffect(() => {
        if (!user) return;
        
        // Finalize any expired contest before setting up the listener
        finalizeContest().then(finalizedSession => {
            if (finalizedSession) {
                setSession(finalizedSession);
            }
        });

        const unsub = onSnapshot(doc(db, "contestSessions", "active"), (doc) => {
            if (doc.exists()) {
                const sessionData = doc.data() as ContestSession;
                // Basic validation
                if (sessionData.id && sessionData.status) {
                    setSession(sessionData);
                }
            } else {
                setSession(null);
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Snapshot error:", err);
            setError("Could not connect to the contest service.");
            setIsLoading(false);
        });

        return () => unsub();
    }, [user]);

    const fetchContestState = useCallback(async (plantToEnter?: Plant) => {
        if (!user) return;

        setIsJoining(true);
        setError(null);
        try {
            // It's safer to finalize any potentially expired contest before joining
            const finalizedSession = await finalizeContest();
             if (finalizedSession) {
                setSession(finalizedSession);
                // If the contest just finished, don't try to join.
                if (finalizedSession.status === 'finished') {
                    setIsJoining(false);
                    return;
                }
            }

            const result = await joinAndGetContestState({
                userId: user.uid,
                username: user.displayName || 'Player',
                plant: plantToEnter,
            });

            if (result.session) {
                setSession(result.session);
            } else if (result.error) {
                throw new Error(result.error);
            } else {
                setSession(null);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to join or create a contest session.");
            toast({ variant: 'destructive', title: 'Contest Error', description: e.message });
        } finally {
            setIsJoining(false);
        }
    }, [user, toast]);

    const handleStartNewContest = () => {
        if (!user) return;
        setShowPlantSelection(true);
    };

    const handleSelectPlant = async (plant: Plant) => {
        setShowPlantSelection(false);
        if (!user) return;
        await fetchContestState(plant);
    };
    
    const handleVote = async (plantId: number) => {
        if (!user || !session) return;
        try {
            playSfx('tap');
            await voteForContestant(user.uid, plantId);
            toast({ title: "Vote Cast!", description: "Your vote has been counted." });
        } catch(e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Voting Error', description: e.message });
        }
    };


    if (isLoading || isJoining) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">{isJoining ? "Joining contest..." : "Finding contest..."}</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <Card className="m-4 text-center py-10 border-destructive">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 rounded-full w-fit p-3 mb-2">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-destructive">Contest Error</CardTitle>
                    <CardDescription>
                       {error}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => fetchContestState()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!session) {
        return (
            <div className="p-4 space-y-6 text-center">
                <header className="flex items-center justify-between pb-4">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/community/park"><ArrowLeft /></Link>
                    </Button>
                    <h1 className="text-2xl text-primary font-bold">Plant Beauty Contest</h1>
                    <div className="w-10"></div>
                </header>
                 <Card className="py-10">
                    <CardHeader>
                        <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
                        <CardTitle className="pt-4">No Active Contest</CardTitle>
                        <CardDescription>There isn't a contest running right now. Why not start one?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleStartNewContest}>Start a New Contest</Button>
                    </CardContent>
                </Card>
                <ContestPlantSelectionDialog
                    open={showPlantSelection}
                    onOpenChange={setShowPlantSelection}
                    allPlants={Object.values(gameData?.plants || {})}
                    onSelectPlant={handleSelectPlant}
                />
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4 pb-20">
             <header className="flex items-center justify-between pb-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/community/park"><ArrowLeft /></Link>
                </Button>
                <h1 className="text-2xl text-primary font-bold text-center">Plant Beauty Contest</h1>
                <div className="w-10"></div>
            </header>

            <Card className="text-center p-4 bg-muted/50">
                <h2 className="text-lg font-semibold text-primary">Round {session.round}</h2>
                <p className="text-sm text-muted-foreground">
                    {session.status === 'waiting' && `Waiting for players... (${session.contestants.length}/${playerPositions.length})`}
                    {session.status === 'voting' && 'Vote for your favorite!'}
                    {session.status === 'finished' && 'Contest Over!'}
                </p>
                <div className="text-3xl font-bold text-primary mt-1">{timeRemaining}s</div>
            </Card>

            {session.status === 'waiting' && (
                <Card className="relative min-h-[400px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Contest Lobby</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="absolute inset-0">
                             {session.contestants.map((c, index) => {
                                const position = playerPositions[index % playerPositions.length];
                                return (
                                    <div key={c.id} className="absolute w-1/4" style={{ top: position.top, left: position.left }}>
                                        <div className="relative aspect-square">
                                            <Image src={c.image} alt={c.name} fill sizes="100px" className="object-contain" />
                                        </div>
                                        <p className="text-center text-xs font-bold text-primary truncate -mt-2">
                                            {c.ownerName}
                                            {c.ownerId === user?.uid && <span className="text-muted-foreground"> (You)</span>}
                                        </p>
                                    </div>
                                )
                             })}
                        </div>
                         {!hasEntered && session.contestants.length < playerPositions.length && (
                            <div className="absolute bottom-4 left-4 right-4">
                                <Button className="w-full" onClick={() => setShowPlantSelection(true)}>
                                    <Trophy className="mr-2" />
                                    Enter Your Plant!
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {session.status === 'voting' && (
                 <div className="grid grid-cols-2 gap-4">
                    {session.contestants.map(c => (
                        <ContestantCard
                            key={c.id}
                            contestant={c}
                            onVote={handleVote}
                            hasVoted={!!hasVoted}
                            isWinner={false}
                        />
                    ))}
                 </div>
            )}
            
            {session.status === 'finished' && session.winner && (
                <Card>
                    <CardHeader className="items-center">
                        <CardTitle className="text-2xl text-yellow-500">We have a winner!</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ContestantCard
                            contestant={session.winner}
                            onVote={() => {}}
                            hasVoted={true}
                            isWinner={true}
                        />
                        <div className="text-center mt-4 space-y-2">
                            <p>Congratulations to <span className="font-bold text-primary">{session.winner.ownerName}</span>!</p>
                             <p className="text-muted-foreground text-sm">They have been awarded 50 gold and a special Red Glitter cosmetic!</p>
                             <Button onClick={() => fetchContestState()} className="mt-4">
                                Find a New Contest
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <ContestPlantSelectionDialog
                open={showPlantSelection}
                onOpenChange={setShowPlantSelection}
                allPlants={Object.values(gameData?.plants || {})}
                onSelectPlant={handleSelectPlant}
            />
        </div>
    )
}
