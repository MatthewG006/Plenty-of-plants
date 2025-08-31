
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, Users, ShieldAlert, PlusCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant, ContestSession } from '@/interfaces/plant';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { getActiveContests, createNewContest, cleanupExpiredContests } from '@/app/actions/contest-actions';
import Link from 'next/link';
import { ContestPlantSelectionDialog } from '@/components/plant-dialogs';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export default function ContestLobbyClientPage() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ContestSession[]>([]);
    const [showPlantSelection, setShowPlantSelection] = useState(false);

    useEffect(() => {
        async function loadContests() {
            setIsLoading(true);
            setError(null);
            try {
                // It's good practice to run a cleanup before fetching.
                await cleanupExpiredContests();
                const activeSessions = await getActiveContests();
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
        // Optional: Set up an interval to refresh the list automatically
        const interval = setInterval(loadContests, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);

    }, [toast]);

    const handleStartNewContest = () => {
        if (!user) return;
        playSfx('tap');
        setShowPlantSelection(true);
    };

    const handleSelectPlant = async (plant: Plant) => {
        setShowPlantSelection(false);
        if (!user || !user.displayName) return;

        setIsCreating(true);
        setError(null);
        try {
            const { sessionId, error } = await createNewContest(user.uid, user.displayName, plant);
            if (error) throw new Error(error);

            toast({ title: 'Contest Created!', description: 'Your new contest lobby is now open.' });
            router.push(`/community/contest/${sessionId}`);

        } catch (e: any) {
            console.error("Failed to start contest:", e);
            setError(e.message || "Failed to start a contest.");
            toast({ variant: 'destructive', title: 'Contest Error', description: e.message });
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
                        onClick={handleStartNewContest} 
                        disabled={isCreating}
                        className="w-full text-lg"
                    >
                        {isCreating ? <Loader2 className="animate-spin" /> : <PlusCircle className="mr-2" />}
                        Create New Contest
                    </Button>
                    
                    <div className="space-y-4">
                        {sessions.length > 0 ? (
                            sessions.map(session => {
                                const createdAtDate = (session.createdAt as unknown as Timestamp)?.toDate ? (session.createdAt as unknown as Timestamp).toDate() : new Date();
                                return (
                                    <Card key={session.id} className="hover:border-primary/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle>{session.contestants[0]?.ownerName}'s Contest</CardTitle>
                                            <CardDescription className="flex items-center gap-4 pt-1">
                                                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {session.contestants.length} / 4 players</span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Created {formatDistanceToNow(createdAtDate, { addSuffix: true })}</span>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button asChild className="w-full">
                                                <Link href={`/community/contest/${session.id}`}>
                                                    <Trophy className="mr-2" />
                                                    Join Lobby
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


            <ContestPlantSelectionDialog
                open={showPlantSelection}
                onOpenChange={setShowPlantSelection}
                allPlants={Object.values(gameData?.plants || {})}
                onSelectPlant={handleSelectPlant}
            />
        </div>
    )
}
