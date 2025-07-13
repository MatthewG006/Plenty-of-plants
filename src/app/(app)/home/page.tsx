
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X, Loader2, Leaf } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
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
import { loadDraws, useDraw, MAX_DRAWS } from '@/lib/draw-manager';

const PLANTS_DATA_STORAGE_KEY = 'plenty-of-plants-data';
const NUM_POTS = 3;

// Helper function to convert image URL to data URI
async function toDataURL(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Helper function to compress an image
async function compressImage(dataUri: string, maxSize = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
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
            resolve(canvas.toDataURL('image/png')); // Use PNG to preserve transparency
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
                    <DialogTitle className="font-headline text-3xl text-center">A new plant!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={plant.imageDataUri} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-2xl font-headline text-primary">{plant.name}</h3>
                    <p className="text-muted-foreground text-center">{plant.description}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="w-full font-headline text-lg">Collect</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function HomePage() {
  const { toast } = useToast();
  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);
  const [availableDraws, setAvailableDraws] = useState(0);

  const refreshDraws = useCallback(() => {
    const draws = loadDraws();
    setAvailableDraws(draws);
  }, []);

  useEffect(() => {
    refreshDraws();

    // Listen for storage changes from other tabs/windows (e.g., the shop or room)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'plenty-of-plants-draws') {
        refreshDraws();
      }
    };
    
    // Also check on focus in case a draw was used in another tab or replenished
    const handleFocus = () => {
      refreshDraws();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshDraws]);


  useEffect(() => {
    let storedDataRaw;
    try {
        storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to read from localStorage", e);
        return;
    }

    if (storedDataRaw) {
      try {
        const storedData = JSON.parse(storedDataRaw);
        const allPlants: Plant[] = [
          ...(storedData.collection || []),
          ...(storedData.desk || []).filter((p: Plant | null): p is Plant => p !== null),
        ];

        if (allPlants.length > 0) {
          const latest = allPlants.reduce((latest, plant) => (plant.id > latest.id ? plant : latest), allPlants[0]);
          setLatestPlant(latest);
        } else {
          setLatestPlant(null);
        }
      } catch (e) {
        console.error("Failed to parse stored plants on home page", e);
        setLatestPlant(null);
      }
    } else {
      setLatestPlant(null);
    }
  }, [drawnPlant]);

  const handleDraw = async () => {
    if (availableDraws <= 0) {
        toast({
            variant: "destructive",
            title: "No Draws Left",
            description: "Visit the shop to get more draws or wait for your daily refill.",
        });
        return;
    }
    setIsDrawing(true);
    try {
        let storedData;
        try {
            const storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
            storedData = storedDataRaw ? JSON.parse(storedDataRaw) : { collection: [], desk: [] };
        } catch (e) {
            console.error("Failed to read or parse localStorage", e);
            storedData = { collection: [], desk: [] };
        }

        const allPlants: Plant[] = [
            ...(storedData.collection || []), 
            ...(storedData.desk || []).filter((p: Plant | null): p is Plant => p !== null)
        ];
        
        let drawnPlantResult: DrawPlantOutput;

        if (allPlants.length === 0) {
            drawnPlantResult = {
                name: "Friendly Fern",
                description: "A happy little fern to start your collection.",
                imageDataUri: await toDataURL("/fern.png"),
            };
        } else {
            drawnPlantResult = await drawPlant();
        }

        const compressedImageDataUri = await compressImage(drawnPlantResult.imageDataUri);
        
        setDrawnPlant({
            ...drawnPlantResult,
            imageDataUri: compressedImageDataUri,
        });
        
        // Decrement draws
        useDraw();
        refreshDraws();

    } catch (e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Failed to draw a plant",
            description: "There was an issue with the AI. Please try again.",
        });
    } finally {
        setIsDrawing(false);
    }
  };

  const handleCollect = async () => {
    if (!drawnPlant) return;

    let storedData;
    try {
        const storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
        storedData = storedDataRaw ? JSON.parse(storedDataRaw) : { collection: [], desk: Array(NUM_POTS).fill(null) };
    } catch (e) {
        console.error("Failed to read or parse localStorage", e);
        storedData = { collection: [], desk: Array(NUM_POTS).fill(null) };
    }
    
    let collectionPlants: Plant[] = storedData.collection || [];
    const deskPlants: (Plant | null)[] = storedData.desk || Array(NUM_POTS).fill(null);

    const allCurrentPlants: Plant[] = [
        ...collectionPlants,
        ...deskPlants.filter((p): p is Plant => p !== null)
    ];

    const lastId = allCurrentPlants.reduce((maxId, p) => Math.max(p.id, maxId), 0);
    
    // Create new plant object. The image is already compressed.
    const newPlant: Plant = {
        id: lastId + 1,
        name: drawnPlant.name,
        form: 'Base',
        image: drawnPlant.imageDataUri,
        hint: drawnPlant.name === 'Friendly Fern' ? 'fern plant' : drawnPlant.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: drawnPlant.description,
    };
    
    const firstEmptyPotIndex = deskPlants.findIndex(p => p === null);
    if (firstEmptyPotIndex !== -1) {
        deskPlants[firstEmptyPotIndex] = newPlant;
    } else {
        collectionPlants.push(newPlant);
    }

    const updatedData = {
        collection: collectionPlants,
        desk: deskPlants,
    };
    
    try {
        localStorage.setItem(PLANTS_DATA_STORAGE_KEY, JSON.stringify(updatedData));
    } catch (e) {
        console.error("Failed to save to localStorage (quota may be exceeded)", e);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your new plant. Your device storage might be full.",
        });
    }
    
    setLatestPlant(newPlant);
    setDrawnPlant(null);
  };


  return (
    <div className="p-4 space-y-6 bg-background">
      <header className="flex flex-col items-center space-y-2">
        <h1 className="font-headline text-3xl text-chart-2 font-bold">
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
            <CardTitle className="text-xl font-semibold text-center">Your Latest Plant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[260px]">
            {latestPlant ? (
              <Link href="/room" className="flex flex-col items-center gap-4 transition-transform hover:scale-105">
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
                <h3 className="text-xl font-headline text-primary">{latestPlant.name}</h3>
              </Link>
            ) : (
              <p className="text-muted-foreground">
                No plants collected yet. Time to draw one!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="items-center">
            <CardTitle className="text-xl font-semibold">Draw a New Plant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    {Array.from({ length: MAX_DRAWS }).map((_, index) => {
                        const isAvailable = index < availableDraws;
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
                <span className="text-sm text-muted-foreground">Draws Available</span>
            </div>
            <Button onClick={handleDraw} disabled={isDrawing || availableDraws <= 0} size="lg" className="w-full font-semibold rounded-full mt-2">
              {isDrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drawing...
                </>
              ) : (
                'Draw New Plant'
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {availableDraws > 0 ? "You have draws available!" : "Out of draws. Visit the shop for more."}
            </p>
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

    