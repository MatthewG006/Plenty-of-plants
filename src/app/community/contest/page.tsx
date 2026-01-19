'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, Users, ShieldAlert, PlusCircle, Clock, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant, ContestSession } from '@/interfaces/plant';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { cleanupExpiredContests } from '@/app/actions/contest-actions';

// Helper to safely convert Firestore Timestamps to ISO strings
const safeTimestampToISO = (ts: any): string => {
    if (!ts) return new Date().toISOString();
    if (ts.toDate) return ts.toDate().toISOString(); // Firestore Timestamp
    if (typeof ts === 'string') return ts; // Already a string
    if (ts.seconds) return new Timestamp(ts.seconds, ts.nanoseconds).toDate().toISOString(); // Serialized Timestamp
    return new Date(ts).toISOString();
};


export default function ContestLobbyPage() {
    const { user, gameData, loading } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ContestSession[]>([]);
    const [showPlantSelection, setShowPlantSelection] = useState(false);

    // Client-side function to get active contests
    const getActiveContestsClient = async (): Promise<ContestSession[]> => {
        const contestRef = collection(db, "contestSessions");
        const now = Timestamp.now();
        const q = query(
          contestRef, 
          where("status", "==", "waiting"),
          where("expiresAt", ">", now)
        );
        
        const snapshot = await getDocs(q);
        
        const sessions: ContestSession[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            sessions.push({
                id: doc.id,
                ...data,
                createdAt: safeTimestampToISO(data.createdAt),
                expiresAt: safeTimestampToISO(data.expiresAt),
            } as ContestSession);
        });
        return sessions;
    };

    const createNewContestClient = async (userId: string, hostName: string, plant: Plant): Promise<{ sessionId?: string; error?: string; }> => {
        try {
            if (!plant) throw new Error("A valid plant must be provided to create a contest.");
            
            const newSessionId = await runTransaction(db, async (transaction) => {
                const newSessionRef = doc(collection(db, "contestSessions"));
                
                const newSessionData = {
                    status: 'waiting',
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromMillis(Date.now() + 3 * 60 * 1000),
                    round: 1,
                    contestantCount: 1,
                    hostId: userId,
                    hostName: hostName,
                };
                transaction.set(newSessionRef, newSessionData);
                
                const newContestantRef = doc(collection(newSessionRef, "contestants"));
                const { id: plantNumericId, ...plantData } = plant;

                const newContestant = {
                    ...plantData,
                    id: newContestantRef.id,
                    ownerId: userId,
                    ownerName: hostName,
                    votes: 0,
                    voterIds: [],
                    lastSeen: serverTimestamp(),
                };
                transaction.set(newContestantRef, newContestant);
                return newSessionRef.id;
            });
            return { sessionId: newSessionId };
        } catch (e: any) {
            console.error("Error creating new contest:", e);
            return { error: e.message || "An unknown error occurred." };
        }
    };


    useEffect(() => {
        let interval: NodeJS.Timeout;

        async function loadContests() {
            setIsLoading(true);
            setError(null);
            try {
                // This function can remain a server action as it's a cleanup task
                await cleanupExpiredContests();
                const activeSessions = await getActiveContestsClient();
                setSessions(activeSessions);
            } catch (e: any) {
                console.error("Failed to load contests:", e);
                setError(e.message || "Could not load active contests.");
                toast({ variant: 'destructive', title: 'Loading Error', description: e.message });
            } finally {
                setIsLoading(false);
            }
        }
        
        loadContests();
        interval = setInterval(loadContests, 30000);
        
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };

    }, [toast]);

    const handleStartNewContest = () => {
        playSfx('tap');
        setShowPlantSelection(true);
    };

    const handleSelectPlant = async (plant: Plant) => {
        if (!user || !user.displayName) return;
        
        setShowPlantSelection(false);
        setIsCreating(true);
        setError(null);
        
        try {
            const { sessionId, error } = await createNewContestClient(user.uid, user.displayName, plant);
            
            if (error) throw new Error(error);

            if (sessionId) {
                toast({ title: 'Contest Created!', description: 'Your new contest lobby is now open.' });
                router.push(`/community/contest/${sessionId}`);
            } else {
                throw new Error("Failed to get a session ID from the server.");
            }

        } catch (e: any) {
            console.error("Failed to start contest:", e);
            setError(e.message || "Failed to start a new contest.");
            toast({ variant: 'destructive', title: 'Contest Creation Error', description: e.message });
        } finally {
            setIsCreating(false);
        }
    };
    
    return (
        <div className="p-4 space-y-6">
             <header className="flex items-center justify-between pb-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/community/park"><ArrowLeft /></Link>
                </Button>
                <h1 className="text-2xl text-primary font-bold">Contest Lobbies</h1>
                <div className="w-10"></div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>How to Play</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Create a new contest or join an existing one.</li>
                        <li>Once the lobby is full, the contest will begin.</li>
                        <li>Vote for the plant you like the best in each round.</li>
                        <li>The plant with the most votes wins!</li>
                    </ol>
                    <Button variant="link" className="p-0 h-auto mt-4">Learn More</Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center pt-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : error ? (
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
                </Card>
            ) : (
                <>
                    <Button 
                        onClick={() => {
                            if (!user) {
                                router.push('/login');
                            } else if (!gameData?.plants || Object.keys(gameData.plants).length === 0) {
                                router.push('/home');
                            } else {
                                handleStartNewContest();
                            }
                        }}
                        disabled={isCreating}
                        className="w-full text-lg"
                    >
                        {isCreating ? (
                            <Loader2 className="animate-spin" />
                        ) : !user ? (
                            <><LogIn className="mr-2"/>Log In to Compete</>
                        ) : !gameData?.plants || Object.keys(gameData.plants).length === 0 ? (
                            'Draw a Plant to Compete!'
                        ) : (
                            <><PlusCircle className="mr-2" />Create New Contest</>
                        )}
                    </Button>
                    
                    <div className="space-y-4">
                        {sessions.length > 0 ? (
                            sessions.map(session => {
                                const createdAtDate = new Date(session.createdAt as string);
                                return (
                                    <Card key={session.id} className="hover:border-primary/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle>{session.hostName}'s Contest</CardTitle>
                                            <CardDescription className="flex items-center gap-4 pt-1">
                                                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {session.contestantCount} / 4 players</span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Created {formatDistanceToNow(createdAtDate, { addSuffix: true })}</span>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button asChild className="w-full">
                                                <Link href={`/community/contest/${session.id}`}>
                                                    <Trophy className="mr-2" />
                                                    {user ? 'Join Lobby' : 'View Lobby'}
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        ) : (
                             <Card className="text-center py-10">
                                <CardHeader>
                                    <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
                                    <CardTitle className="pt-4">No Active Contests</CardTitle>
                                    <CardDescription>There aren't any contests running right now. Why not start one?</CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    </div>
                </>
            )}

            {user && (
                <ContestPlantSelectionDialog
                    open={showPlantSelection}
                    onOpenChange={setShowPlantSelection}
                    allPlants={Object.values(gameData?.plants || {})}
                    onSelectPlant={handleSelectPlant}
                />
            )}
        </div>
    )
}
