
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Loader2, Leaf, LogIn, MessageSquare } from 'lucide-react';
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

        const firstPlantKey = Object.keys(gameData.plants)[0];
        if (firstPlantKey) {
            return gameData.plants[parseInt(firstPlantKey, 10)];
        }

        return null;
    }, [gameData]);

    if (loading) {
        return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
            <Image 
                src="https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/park.png?alt=media&token=e8ab2d4a-d8a5-49a7-96a3-46cc4e4b6a6f"
                alt="A lush green park with a winding path and a bench."
                fill
                className="object-cover"
                priority
            />

            <div className="absolute top-4 left-4 z-10">
                <Button asChild variant="secondary" className="bg-white/90 hover:bg-white text-black/80 shadow-md">
                    <Link href="/community">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Showcase
                    </Link>
                </Button>
            </div>

            <div className="relative h-full flex flex-col items-center justify-between p-4 pt-24 pb-16">
                
                {/* Top Card */}
                <div className="bg-slate-800/70 backdrop-blur-md rounded-xl p-6 text-white text-center w-full max-w-sm shadow-lg">
                    <h1 className="text-3xl md:text-4xl font-bold">Welcome to the Park</h1>
                    <p className="mt-2 text-base md:text-lg text-white/90">A quiet place to relax... or compete!</p>
                    <Button asChild className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                        <Link href={user ? '/community/contest' : '/login'}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Enter Plant Beauty Contest
                        </Link>
                    </Button>
                </div>

                {/* Bottom Plant Display */}
                <div className="h-48 w-48 flex items-end justify-center">
                    {user && plantToShow && (
                        <div className="flex flex-col items-center">
                            <Button variant="secondary" size="lg" className="rounded-full h-14 w-20 mb-[-2rem] z-10 shadow-lg">
                                <MessageSquare className="h-7 w-7 text-primary" />
                            </Button>
                            <div className="w-48 h-48 relative drop-shadow-2xl">
                                <Image 
                                    src={plantToShow.image} 
                                    alt={plantToShow.name} 
                                    fill 
                                    className="object-contain" 
                                    data-ai-hint={plantToShow.hint}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityParkPage;
