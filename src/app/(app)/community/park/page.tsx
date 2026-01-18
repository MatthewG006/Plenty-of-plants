'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trees, Trophy, Loader2, Leaf } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { Plant } from '@/interfaces/plant';
import Image from 'next/image';

const CommunityParkPage = () => {
    const { user, gameData, loading } = useAuth();

    const plantToShow = React.useMemo(() => {
        if (!gameData || !gameData.plants) return null;
        
        const plantIds = Object.keys(gameData.plants);
        if (plantIds.length === 0) return null;

        const showcaseId = gameData.showcasePlantIds?.[0];
        if (showcaseId && gameData.plants[showcaseId]) return gameData.plants[showcaseId];

        const deskId = gameData.deskPlantIds?.find(id => id !== null);
        if (deskId && gameData.plants[deskId]) return gameData.plants[deskId];
        
        const collectionId = gameData.collectionPlantIds?.[0];
        if (collectionId && gameData.plants[collectionId]) return gameData.plants[collectionId];

        // Fallback to the very first plant a user collected
        const firstPlantKey = Object.keys(gameData.plants)[0];
        if (firstPlantKey) {
            return gameData.plants[parseInt(firstPlantKey, 10)];
        }

        return null;
    }, [gameData]);

    const LoggedOutView = () => (
        <Card className="bg-black/50 backdrop-blur-sm border-white/20 max-w-md w-full text-center">
            <CardHeader>
                <div className="mx-auto bg-white/10 rounded-full w-fit p-4 mb-4">
                    <Trees className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-4xl font-bold">The Park</CardTitle>
                <CardDescription className="text-lg text-white/90 pt-2">
                    A tranquil place to relax and the gateway to the Plant Beauty Contest.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                    <Link href="/community/contest">
                        <Trophy className="mr-2"/>
                        Enter the Beauty Contest
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );

    const LoggedInView = ({ plant }: { plant: Plant | null }) => (
        <div className="flex flex-col items-center gap-6">
            {plant ? (
                 <div className="flex flex-col items-center text-center">
                    <div className="relative w-64 h-64 drop-shadow-2xl">
                         <Image src={plant.image} alt={plant.name} fill className="object-contain" data-ai-hint={plant.hint} />
                    </div>
                    <p className="text-2xl font-bold mt-2 bg-black/50 px-4 py-2 rounded-xl">
                        {plant.name}
                    </p>
                     <p className="mt-2 text-white/90">...is enjoying a day at the park.</p>
                </div>
            ) : (
                <Card className="bg-black/50 backdrop-blur-sm border-white/20 max-w-md w-full text-center">
                    <CardHeader>
                        <Leaf className="w-16 h-16 mx-auto text-white/80" />
                        <CardTitle className="pt-4">Your Park Adventure Awaits</CardTitle>
                        <CardDescription className="text-white/90">
                            Draw your first plant on the Home screen to see it here in the park!
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 mt-4">
                <Link href="/community/contest">
                    <Trophy className="mr-2"/>
                    Visit the Beauty Contest
                </Link>
            </Button>
        </div>
    );

    return (
        <div
            className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 text-white"
            style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/park.png?alt=media&token=e8ab2d4a-d8a5-49a7-96a3-46cc4e4b6a6f')" }}
        >
            <div className="absolute top-4 left-4">
                <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <Link href="/community"><ArrowLeft /></Link>
                </Button>
            </div>

            {loading ? (
                <Loader2 className="w-10 h-10 animate-spin" />
            ) : user ? (
                <LoggedInView plant={plantToShow} />
            ) : (
                <LoggedOutView />
            )}
        </div>
    );
};

export default CommunityParkPage;
