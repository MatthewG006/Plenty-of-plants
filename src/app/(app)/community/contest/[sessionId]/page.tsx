
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, Users, Star, Crown, Sparkles, ShieldAlert, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant, ContestSession, Contestant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { joinContest, voteForContestant, sendHeartbeat, processContestState } from '@/app/actions/contest-actions';
import Link from 'next/link';
import { doc, onSnapshot, Timestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import confetti from 'canvas-confetti';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';
import { useParams, useRouter } from 'next/navigation';

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

function ContestantCard({ contestant, onVote, hasVoted, isWinner }: { contestant: Contestant, onVote: (id: string) => void, hasVoted: boolean, isWinner: boolean }) {
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
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<ContestSession | null>(null);
    const [contestants, setContestants] = useState<Contestant[]>([]);
    const [showPlantSelection, setShowPlantSelection] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    const hasEntered = user && contestants.some(c => c.ownerId === user.uid);
    const hasVoted = user && contestants.some(c => c.voterIds?.includes(user.uid));

    // Heartbeat effect
    useEffect(() => {
        if (user && hasEntered && session?.status === 'waiting' && sessionId) {
            const interval = setInterval(() => {
                sendHeartbeat(sessionId, user.uid);
            }, HEARTBEAT_INTERVAL);

            // Send an immediate heartbeat on joining
            sendHeartbeat(sessionId, user.uid);

            return () => clearInterval(interval);
        }
    }, [user, hasEntered, session?.status, sessionId]);

    useEffect(() => {
        if (!session || session.status === 'finished') return;

        let timer: NodeJS.Timeout;

        const updateTimer = () => {
            if (session.expiresAt) {
                const endTime = (session.expiresAt as any)?.seconds ? new Timestamp((session.expiresAt as any).seconds, (session.expiresAt as any).nanoseconds).toDate().getTime() : new Date(session.expiresAt as string).getTime();
                const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                setTimeRemaining(remaining);
    
                if (remaining <= 0) {
                    processContestState(sessionId);
                }
            }
        };

        updateTimer(); 
        timer = setInterval(updateTimer, 1000); 

        return () => clearInterval(timer);
    }, [session, sessionId]);


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
        if (!user || !sessionId) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const unsubSession = onSnapshot(doc(db, "contestSessions", sessionId), (doc) => {
            if (doc.exists()) {
                 const data = doc.data();
                 const sessionData: ContestSession = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : new Date().toISOString(),
                 } as ContestSession;
                 setSession(sessionData);
            } else {
                setSession(null);
                setError("This contest lobby no longer exists.");
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Snapshot error:", err);
            setError("Could not connect to the contest service.");
            setIsLoading(false);
        });

        const unsubContestants = onSnapshot(collection(db, "contestSessions", sessionId, "contestants"), (snapshot) => {
            const contestantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contestant));
            setContestants(contestantsData);
        });


        return () => {
            unsubSession();
            unsubContestants();
        };
    }, [user, sessionId]);

    // This effect handles automatic navigation on error/timeout
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                router.push('/community/contest');
            }, 3000); // 3-second delay before navigating back

            return () => clearTimeout(timer); // Clean up the timer
        }
    }, [error, router]);

    const handleSelectPlant = async (plant: Plant) => {
        if (!user || !user.displayName) return;
        setShowPlantSelection(false);
        setIsJoining(true);
        setError(null);
        try {
            const { success, error } = await joinContest(sessionId, user.uid, user.displayName, plant);
            if (error) throw new Error(error);
            if (success) {
                toast({ title: 'You have entered the contest!' });
            }

        } catch (e: any) {
            console.error("Failed to join contest:", e);
            setError(e.message || "Failed to join the contest.");
            toast({ variant: 'destructive', title: 'Contest Error', description: e.message });
        } finally {
            setIsJoining(false);
        }
    };
    
    const handleVote = async (contestantId: string) => {
        if (!user || !session || !sessionId) return;
        try {
            playSfx('tap');
            await voteForContestant(sessionId, user.uid, contestantId);
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
    
    if (error || !session) {
        return (
             <Card className="m-4 text-center py-10 border-destructive">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 rounded-full w-fit p-3 mb-2">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-destructive">Contest Error</CardTitle>
                    <CardDescription>
                       {error || 'The contest session could not be found.'}
                       <br />
                       You will be returned to the lobby list shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Loader2 className="h-6 w-6 animate-spin text-destructive mx-auto" />
                </CardContent>
            </Card>
        )
    }


    return (
        <div className="p-4 space-y-4 pb-20">
             <header className="flex items-center justify-between pb-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/community/contest"><ArrowLeft /></Link>
                </Button>
                <h1 className="text-2xl text-primary font-bold text-center">Plant Beauty Contest</h1>
                <div className="w-10"></div>
            </header>

            <Card className="text-center p-4 bg-muted/50">
                <h2 className="text-lg font-semibold text-primary">Round {session.round}</h2>
                <p className="text-sm text-muted-foreground">
                    {session.status === 'waiting' && `Waiting for players... (${session.contestantCount}/${playerPositions.length})`}
                    {session.status === 'voting' && 'Vote for your favorite!'}
                    {session.status === 'finished' && 'Contest Over!'}
                </p>
                <div className="text-3xl font-bold text-primary mt-1">{timeRemaining}s</div>
            </Card>

            {session.status === 'waiting' && timeRemaining <= 0 && session.contestantCount < 2 && (
                <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">The lobby timer has expired.</p>
                    <Button onClick={() => window.location.reload()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Status
                    </Button>
                </div>
            )}

            {session.status === 'waiting' && (
                <Card className="relative min-h-[400px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Contest Lobby</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="absolute inset-0">
                             {contestants.map((c, index) => {
                                const position = playerPositions[index % playerPositions.length];
                                return (
                                    <div key={c.id} className="absolute w-1/4" style={{ top: position.top, left: position.left }}>
                                        <div className="relative aspect-square">
                                            <Image src={c.image} alt={c.name} fill sizes="100px" className="object-contain" />
                                        </div>
                                        <p className="text-center text-xs font-bold text-primary truncate">
                                            {c.ownerName}
                                            {c.ownerId === user?.uid && <span className="text-muted-foreground"> (You)</span>}
                                        </p>
                                    </div>
                                )
                             })}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                            {!hasEntered && timeRemaining > 0 && session.contestantCount < playerPositions.length ? (
                                <Button className="w-full" onClick={() => setShowPlantSelection(true)}>
                                    <Trophy className="mr-2" />
                                    Enter Your Plant!
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            )}

            {session.status === 'voting' && (
                 <div className="grid grid-cols-2 gap-4">
                    {contestants.map(c => (
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
                             <Button asChild className="mt-4">
                               <Link href="/community/contest">Find a New Contest</Link>
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
