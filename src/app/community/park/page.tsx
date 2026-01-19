
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Loader2, Leaf, LogIn, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { Plant } from '@/interfaces/plant';
import Image from 'next/image';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import { getImageDataUriAction } from '@/app/actions/image-actions';

const plantThoughts = [
    "What a lovely day in the park!",
    "I'm feeling the sunshine on my leaves.",
    "I hope I get watered soon.",
    "Did you see that butterfly?",
    "It's nice to be outside for a change.",
    "What's for dinner?",
    "I wonder if I'll evolve soon...",
];


const CommunityParkPage = () => {
    const { user, gameData, loading } = useAuth();
    const [processedPlantImage, setProcessedPlantImage] = React.useState<string | null>(null);
    const [thought, setThought] = React.useState<string | null>(null);
    const thoughtTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

    React.useEffect(() => {
        const processImage = async () => {
            if (plantToShow && plantToShow.image) {
                setProcessedPlantImage(null); // Reset on plant change
                try {
                    const dataUri = await getImageDataUriAction(plantToShow.image);
                    const transparentImage = await makeBackgroundTransparent(dataUri);
                    setProcessedPlantImage(transparentImage);
                } catch (error) {
                    console.error(`Failed to process image for park plant: ${plantToShow.id}`, error);
                    setProcessedPlantImage(plantToShow.image); // Fallback to original
                }
            } else {
                setProcessedPlantImage(null);
            }
        };

        processImage();
    }, [plantToShow]);

    React.useEffect(() => {
        return () => {
            if (thoughtTimeoutRef.current) {
                clearTimeout(thoughtTimeoutRef.current);
            }
        };
    }, []);

    const handleThoughtBubbleClick = () => {
        if (thoughtTimeoutRef.current) {
            clearTimeout(thoughtTimeoutRef.current);
        }
        const randomThought = plantThoughts[Math.floor(Math.random() * plantThoughts.length)];
        setThought(randomThought);
        thoughtTimeoutRef.current = setTimeout(() => {
            setThought(null);
        }, 4000);
    };


    if (loading) {
        return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const imageSrc = processedPlantImage || plantToShow?.image;

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
                    <p className="mt-2 text-base md:text-lg text-white/90">A quiet place to relax with your favorite plant... or enter the Plant Beauty Contest to see how your collection stacks up against others!</p>
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
                        <div className="relative flex flex-col items-center">
                            {thought && (
                                <div className="absolute bottom-full mb-14 bg-white text-primary p-3 rounded-xl shadow-lg animate-fade-in-up z-20 w-max max-w-[200px] text-center">
                                    <p className="font-semibold">{thought}</p>
                                </div>
                            )}
                            <Button variant="secondary" size="lg" className="rounded-full h-14 w-20 mb-[-2rem] z-10 shadow-lg" onClick={handleThoughtBubbleClick}>
                                <MessageSquare className="h-7 w-7 text-primary" />
                            </Button>
                            <div className="w-48 h-48 relative drop-shadow-2xl">
                                {imageSrc ? (
                                    <Image 
                                        src={imageSrc} 
                                        alt={plantToShow.name} 
                                        fill 
                                        className="object-contain" 
                                        data-ai-hint={plantToShow.hint}
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-white"/>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityParkPage;
