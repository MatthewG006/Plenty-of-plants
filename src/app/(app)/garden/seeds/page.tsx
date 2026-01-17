

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock, Sprout, ChevronsRight, Leaf, Zap, Share2, LogIn } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { growSeed, savePlant, useFertilizer } from '@/lib/firestore';
import type { Seed, DrawPlantOutput, Plant } from '@/interfaces/plant';
import { drawPlantAction } from '@/app/actions/draw-plant';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { makeBackgroundTransparent, compressImage } from '@/lib/image-compression';
import { NewPlantDialog } from '@/components/plant-dialogs';
import { updateCollectionProgress } from '@/lib/challenge-manager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const GERMINATION_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours

function getTimeRemaining(endTime: number) {
    const total = endTime - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)));
    return { hours, minutes, seconds };
}

function SeedCard({ seed, processedImage, onUseFertilizer, canUseFertilizer }: { seed: Seed, processedImage: string | null, onUseFertilizer: (seedId: string) => void, canUseFertilizer: boolean }) {
    const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const isReady = useMemo(() => Date.now() >= seed.startTime + GERMINATION_TIME_MS, [seed.startTime]);

    useEffect(() => {
        if (isReady) return;

        const timer = setInterval(() => {
            const remaining = getTimeRemaining(seed.startTime + GERMINATION_TIME_MS);
            if (remaining.hours <= 0 && remaining.minutes <= 0 && remaining.seconds <= 0) {
                setTime({ hours: 0, minutes: 0, seconds: 0 });
                clearInterval(timer);
            } else {
                setTime(remaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isReady, seed.startTime]);

    if (isReady) {
        return (
            <Card className="flex flex-col items-center justify-center p-4 bg-primary/10 border-primary/50 text-center h-48">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-28 h-28 relative">
                        {processedImage ? (
                            <Image src={processedImage} alt="Ready Seed" fill sizes="112px" className="object-contain animate-glow brightness-125 saturate-150" data-ai-hint="seed icon" unoptimized />
                        ) : (
                             <Image src="/seed.png" alt="Ready Seed" fill sizes="112px" className="object-contain animate-glow brightness-125 saturate-150" data-ai-hint="seed icon" unoptimized />
                        )}
                    </div>
                    <p className="font-bold text-primary mt-2">Ready to Grow!</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="flex flex-col items-center justify-center p-4 bg-muted/50 text-center h-48">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                 <div className="w-24 h-24 relative">
                    {processedImage ? (
                        <Image src={processedImage} alt="Germinating Seed" fill sizes="96px" className="object-contain opacity-70" data-ai-hint="seed icon" unoptimized />
                    ) : (
                        <Image src="/seed.png" alt="Germinating Seed" fill sizes="96px" className="object-contain opacity-70" data-ai-hint="seed icon" unoptimized />
                    )}
                </div>
                <p className="text-xl font-bold text-primary tabular-nums">{`${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`}</p>
                <div className="text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <span>Until Germination</span>
                    {canUseFertilizer && (
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onUseFertilizer(seed.id)}>
                            <Zap className="w-3 h-3 mr-1" />
                            Fertilize
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function EmptySeedSlot() {
    return (
        <div className="h-48 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-muted-foreground/60">
            <Sprout className="w-10 h-10 mb-2" />
            <span className="text-sm">Empty Slot</span>
        </div>
    )
}

export default function SeedsPage() {
    const { user, gameData, loading } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();

    const [isGrowing, setIsGrowing] = useState<string | null>(null);
    const [processedSeedImage, setProcessedSeedImage] = useState<string | null>(null);
    const [grownPlant, setGrownPlant] = useState<DrawPlantOutput | null>(null);
    const [grownPlantSeedId, setGrownPlantSeedId] = useState<string | null>(null);

    useEffect(() => {
        const imageToDataUri = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new window.Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas context not found'));
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = url;
            });
        };

        const processImage = async () => {
            try {
                const dataUri = await imageToDataUri('/seed.png');
                const transparentImage = await makeBackgroundTransparent(dataUri);
                setProcessedSeedImage(transparentImage);
            } catch (error) {
                console.error("Failed to process seed image:", error);
                setProcessedSeedImage('/seed.png'); // Fallback to original image
            }
        };

        processImage();
    }, []);


    const handleGrowSeed = async (seed: Seed) => {
        if (!user || !gameData) return;

        setIsGrowing(seed.id);
        try {
            playSfx('success');
            const existingImageFilenames = gameData.plants ? (Object.values(gameData.plants) as Plant[]).map(p => p.hint) : [];
            const drawnPlantResult = await drawPlantAction(existingImageFilenames);
            
            setGrownPlant(drawnPlantResult);
            setGrownPlantSeedId(seed.id);

        } catch (e: any) {
             console.error(e);
             toast({
                variant: "destructive",
                title: "Failed to grow plant",
                description: "There was an issue with the AI. Please try again.",
            });
        } finally {
            setIsGrowing(null);
        }
    };
    
    const handleCollectGrownPlant = async () => {
        if (!user || !grownPlant || !grownPlantSeedId) return;

        try {
            const compressedImageDataUri = await compressImage(grownPlant.imageDataUri);
            const newPlant = await savePlant(user.uid, { ...grownPlant, imageDataUri: compressedImageDataUri });
            await growSeed(user.uid, grownPlantSeedId);
            await updateCollectionProgress(user.uid);
            
            toast({
                title: 'A New Plant Grew!',
                description: `You got a ${newPlant.name} from your seed.`
            });

        } catch (e: any) {
            console.error("Failed to save grown plant", e);
            toast({
                variant: "destructive",
                title: "Storage Error",
                description: "Could not save your new plant.",
            });
        }
        
        setGrownPlant(null);
        setGrownPlantSeedId(null);
    }

    const handleFertilizeSeed = async (seedId: string) => {
        if (!user) return;
        try {
            await useFertilizer(user.uid, seedId);
            playSfx('chime');
            toast({
                title: 'Fertilizer Used!',
                description: 'Your seed will be ready 8 hours sooner.'
            });
        } catch (e: any) {
            console.error("Failed to use fertilizer", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
             <div 
                className="min-h-screen bg-contain bg-bottom bg-no-repeat flex flex-col"
                style={{backgroundImage: "url('/garden-bg-sky.png')"}}
            >
                <header className="flex flex-col items-center gap-2 p-4 text-center bg-background/80 backdrop-blur-sm shrink-0">
                    <h1 className="text-3xl text-primary font-bold">My Seed Bag</h1>
                    <div className="flex gap-2 pt-2">
                        <Button asChild>
                            <Link href="/garden">
                                <Leaf className="mr-1.5 h-4 w-4" />
                                Plants
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href="/garden/seeds">
                                <Sprout className="mr-1.5 h-4 w-4" />
                                Seeds
                            </Link>
                        </Button>
                    </div>
                </header>
                <main className="flex-grow flex items-center justify-center p-4">
                    <Card className="text-center py-10 w-full max-w-md">
                        <CardHeader>
                            <div className="mx-auto bg-primary/10 rounded-full w-fit p-3 mb-2">
                                <Sprout className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle>Grow Plants from Seeds</CardTitle>
                            <CardDescription>Earn seeds when your plants level up in the Garden. Place them here to germinate, and in 24 hours, you can grow them into a brand new plant!</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Log In to Manage Seeds</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
             </div>
        );
    }

    const seeds = gameData.seeds || [];
    const canUseFertilizer = gameData.fertilizerCount > 0;
    const seedBagSize = gameData.seedBagSize || 3;
    
    return (
        <>
            <div 
                className="min-h-screen bg-contain bg-bottom bg-no-repeat flex flex-col"
                style={{backgroundImage: "url('/garden-bg-sky.png')"}}
            >
                <header className="flex flex-col items-center gap-2 p-4 text-center bg-background/80 backdrop-blur-sm shrink-0">
                    <h1 className="text-3xl text-primary font-bold">My Seed Bag</h1>
                    <p className="text-muted-foreground">You have {seedBagSize - seeds.length} empty seed slots. Earn seeds when your plants level up.</p>
                    <div className="flex gap-2 pt-2">
                        <Button asChild>
                            <Link href="/garden">
                                <Leaf className="mr-1.5 h-4 w-4" />
                                Plants
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href="/garden/seeds">
                                <Sprout className="mr-1.5 h-4 w-4" />
                                Seeds
                            </Link>
                        </Button>
                    </div>
                </header>

                <Alert className="m-4 mt-0 rounded-t-none border-t-0 bg-accent/50">
                  <Share2 className="h-4 w-4" />
                  <AlertTitle>Want more seeds?</AlertTitle>
                  <AlertDescription>
                    Get 3 more slots in your seed bag! Go to your <Button variant="link" asChild className="p-0 h-auto"><Link href="/profile">Profile</Link></Button> and share the game.
                  </AlertDescription>
                </Alert>

                <main className="flex-grow p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.from({ length: seedBagSize }).map((_, index) => {
                            const seed = seeds[index];
                            if (seed) {
                                const isReady = Date.now() >= seed.startTime + GERMINATION_TIME_MS;
                                return (
                                    <div key={seed.id} className="space-y-2">
                                        <SeedCard 
                                            seed={seed} 
                                            processedImage={processedSeedImage}
                                            onUseFertilizer={handleFertilizeSeed}
                                            canUseFertilizer={canUseFertilizer && !isReady}
                                        />
                                        <Button 
                                            className="w-full" 
                                            disabled={!isReady || !!isGrowing}
                                            onClick={() => handleGrowSeed(seed)}
                                        >
                                            {isGrowing === seed.id ? <Loader2 className="animate-spin" /> : 'Grow'}
                                        </Button>
                                    </div>
                                );
                            }
                            return <EmptySeedSlot key={`empty-${index}`} />;
                        })}
                    </div>
                    {seeds.length === 0 && (
                        <Card className="text-center py-10 mt-4">
                            <CardHeader>
                                <CardTitle>Empty Seed Bag</CardTitle>
                                <CardContent className="pt-4">
                                   <p className="text-muted-foreground">Water your plants in the garden. When they level up, you might earn a new seed!</p>
                                </CardContent>
                            </CardHeader>
                        </Card>
                    )}
                </main>
            </div>
            <NewPlantDialog
                plant={grownPlant}
                open={!!grownPlant}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCollectGrownPlant();
                    }
                }}
            />
        </>
    );
}
