
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, Sprout, ChevronsRight, Leaf, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { growSeed, savePlant, useFertilizer } from '@/lib/firestore';
import type { Seed } from '@/interfaces/plant';
import { drawPlantAction } from '@/app/actions/draw-plant';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { makeBackgroundTransparent } from '@/lib/image-compression';


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
                            <Image src={processedImage} alt="Ready Seed" fill className="object-contain animate-glow brightness-125 saturate-150" data-ai-hint="seed icon" />
                        ) : (
                             <Image src="/seed.png" alt="Ready Seed" fill className="object-contain animate-glow brightness-125 saturate-150" data-ai-hint="seed icon" />
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
                        <Image src={processedImage} alt="Germinating Seed" fill className="object-contain opacity-70" data-ai-hint="seed icon" />
                    ) : (
                        <Image src="/seed.png" alt="Germinating Seed" fill className="object-contain opacity-70" data-ai-hint="seed icon" />
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


export default function SeedsPage() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();

    const [isGrowing, setIsGrowing] = useState<string | null>(null);
    const [processedSeedImage, setProcessedSeedImage] = useState<string | null>(null);

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
            const existingNames = gameData.plants ? Object.values(gameData.plants).map(p => p.name) : [];
            const drawnPlantResult = await drawPlantAction(existingNames);
            
            const newPlant = await savePlant(user.uid, drawnPlantResult);
            await growSeed(user.uid, seed.id);
            playSfx('success');
            
            toast({
                title: 'A New Plant Grew!',
                description: `You got a ${newPlant.name} from your seed.`
            });

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

    if (!user || !gameData) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const seeds = gameData.seeds || [];
    const canUseFertilizer = gameData.fertilizerCount > 0;
    
    return (
        <div 
            className="min-h-screen bg-contain bg-bottom bg-no-repeat flex flex-col"
            style={{backgroundImage: "url('/garden-bg-sky.png')"}}
        >
            <header className="flex flex-col items-center gap-2 p-4 text-center bg-background/80 backdrop-blur-sm shrink-0">
                <h1 className="text-3xl text-primary font-bold">My Garden</h1>
                <p className="text-muted-foreground">Earn seeds when your plants level up. Wait for them to germinate, then grow them!</p>
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

            <main className="flex-grow p-4">
                {seeds.length > 0 ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {seeds.map(seed => {
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
                            )
                        })}
                    </div>
                ) : (
                    <Card className="text-center py-10 mt-4">
                        <CardHeader>
                            <CardTitle>Empty Seed Tray</CardTitle>
                            <CardContent className="pt-4">
                               <p className="text-muted-foreground">Water your plants in the garden. When they level up, you'll earn a new seed!</p>
                            </CardContent>
                        </CardHeader>
                    </Card>
                )}
            </main>
        </div>
    );
}
