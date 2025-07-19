
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X, Loader2, Leaf } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { Plant } from '@/interfaces/plant';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDraw, MAX_DRAWS, refillDraws } from '@/lib/draw-manager';
import { useAudio } from '@/context/AudioContext';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { savePlant } from '@/lib/firestore';

// Helper function to compress an image
async function compressImage(dataUri: string, maxSize = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous'; // Fix for tainted canvas error
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

function NewPlantDialog({ plant, open, onOpenChange }: { plant: DrawPlantOutput | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!plant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center">A new plant!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={plant.imageDataUri} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-2xl font-semibold text-primary">{plant.name}</h3>
                    <p className="text-muted-foreground text-center">{plant.description}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="w-full text-lg">Collect</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function HomePage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();

  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);

  useEffect(() => {
    if (user) {
        refillDraws(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (gameData?.plants) {
        const allPlants = Object.values(gameData.plants);
        if (allPlants.length > 0) {
          const latest = allPlants.reduce((latest, plant) => (plant.id > latest.id ? plant : latest), allPlants[0]);
          setLatestPlant(latest);
        } else {
          setLatestPlant(null);
        }
    }
  }, [gameData]);

  const handleDraw = async () => {
    if (!gameData || gameData.draws <= 0) {
        toast({
            variant: "destructive",
            title: "No Draws Left",
            description: "Visit the shop to get more draws or wait for your daily refill.",
        });
        return;
    }
    if (!user) return;

    setIsDrawing(true);
    try {
        await useDraw(user.uid);

        const drawnPlantResult = await drawPlant();
        const compressedImageDataUri = await compressImage(drawnPlantResult.imageDataUri);
        
        playSfx('success');
        setDrawnPlant({
            ...drawnPlantResult,
            imageDataUri: compressedImageDataUri,
        });

    } catch (e: any) {
        console.error(e);
        if (e.message === 'Invalid API Key') {
            toast({
                variant: "destructive",
                title: "Invalid API Key",
                description: "Please check your GOOGLE_API_KEY in the .env file.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Failed to draw a plant",
                description: "There was an issue with the AI. Please try again.",
            });
        }
    } finally {
        setIsDrawing(false);
    }
  };

  const handleCollect = async () => {
    if (!drawnPlant || !user) return;

    try {
        const newPlant = await savePlant(user.uid, drawnPlant);
        setLatestPlant(newPlant);
    } catch (e) {
        console.error("Failed to save plant to Firestore", e);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your new plant.",
        });
    }
    
    setDrawnPlant(null);
  };
  
  if (!user || !gameData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-white">
      <header className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl text-foreground font-bold">
          Plenty Of Plants
        </h1>
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </Button>
        </div>
      </header>

      <main className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center">Your Latest Plant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[260px]">
            {latestPlant ? (
              <Link href="/room" className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
                <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
                  {latestPlant.image !== 'placeholder' ? (
                      <Image
                        src={latestPlant.image}
                        alt={latestPlant.name}
                        width={192}
                        height={192}
                        className="object-cover w-full h-full"
                        data-ai-hint={latestPlant.hint}
                      />
                  ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Leaf className="w-16 h-16 text-muted-foreground" />
                      </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-primary">{latestPlant.name}</h3>
                <div className="w-4/5">
                    <Progress value={(latestPlant.xp / 1000) * 100} className="h-2" />
                </div>
              </Link>
            ) : (
              <p className="text-muted-foreground">
                No plants collected yet. Time to draw one!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    {Array.from({ length: MAX_DRAWS }).map((_, index) => {
                        const isAvailable = index < gameData.draws;
                        return (
                            <div key={index} className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-white shadow-inner",
                                isAvailable ? "bg-green-500" : "bg-red-500"
                            )}>
                                {isAvailable ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <X className="h-5 w-5" />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="text-sm text-muted-foreground text-center">
                    <span>Draws Available</span>
                </div>
            </div>
            <Button onClick={handleDraw} disabled={isDrawing || gameData.draws <= 0} size="lg" className="w-full rounded-full mt-2">
              {isDrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drawing...
                </>
              ) : (
                'Draw New Plant'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
      
      <NewPlantDialog
        plant={drawnPlant}
        open={!!drawnPlant}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCollect();
          }
        }}
      />
    </div>
  );
}
