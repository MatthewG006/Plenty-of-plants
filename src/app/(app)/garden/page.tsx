
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Loader2, Plus, Droplets, Sprout, ChevronsRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { updateGardenArrangement, useSprinkler } from '@/lib/firestore';
import { PlantCareDialog, PlantSwapDialog } from '@/components/plant-dialogs';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import Link from 'next/link';


const NUM_GARDEN_PLOTS = 12;

function PlantCard({ plant, onClick, processedImage, className }: { plant: Plant, onClick: (plant: Plant) => void, processedImage: string | null, className?: string }) {
    return (
        <Card className={cn("group overflow-hidden shadow-md w-full h-[120px] sm:h-[140px] relative cursor-pointer bg-white/70 backdrop-blur-sm", className)} onClick={() => onClick(plant)}>
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex-grow relative flex items-center justify-center bg-black/10">
                    {processedImage && processedImage !== 'placeholder' ? (
                        <Image src={processedImage} alt={plant.name} fill sizes="100px" className="object-contain p-1" data-ai-hint={plant.hint} />
                    ) : plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                </div>
                <div className="p-1 text-center space-y-0.5 shrink-0">
                    <p className="text-xs font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-[10px] text-muted-foreground">Lvl {plant.level}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyPlotCard({ onClick, className }: { onClick: () => void, className?: string }) {
    return (
        <Card className={cn("group overflow-hidden shadow-md w-full h-[120px] sm:h-[140px] relative cursor-pointer bg-black/10 backdrop-blur-sm", className)} onClick={onClick}>
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex-grow relative flex items-center justify-center border-2 border-dashed border-white/30">
                     <div className="text-center">
                        <Plus className="mx-auto h-8 w-8 text-white/70" />
                    </div>
                </div>
                <div className="p-1 text-center shrink-0">
                    <div className="h-[28px]"></div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function GardenPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();

  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);
  const [gardenPlantIds, setGardenPlantIds] = useState<(number | null)[]>([]);
  
  const [activeCarePlant, setActiveCarePlant] = useState<Plant | null>(null);
  const [swapState, setSwapState] = useState<{plantToReplaceId: number | null, gardenPlotIndex: number} | null>(null);

  const [processedGardenImages, setProcessedGardenImages] = useState<Record<number, string | null>>({});
  const [isUsingSprinkler, setIsUsingSprinkler] = useState(false);

  useEffect(() => {
    if (gameData) {
        setCollectionPlantIds(gameData.collectionPlantIds || []);
        const currentGardenIds = gameData.gardenPlantIds || [];
        // Ensure gardenPlantIds has exactly NUM_GARDEN_PLOTS items
        const filledGardenIds = Array.from({ length: NUM_GARDEN_PLOTS }, (_, i) => currentGardenIds[i] || null);
        setGardenPlantIds(filledGardenIds);
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);

  const gardenPlants = useMemo(() => gardenPlantIds.map(id => id ? allPlants[id] : null), [gardenPlantIds, allPlants]);
  
  useEffect(() => {
    const processImages = async () => {
        const newImages: Record<number, string | null> = {};
        for (const plant of gardenPlants) {
            if (plant && plant.image) {
                if (!plant.image.startsWith('/')) { // Don't process local placeholder images
                    try {
                        const transparentImage = await makeBackgroundTransparent(plant.image);
                        newImages[plant.id] = transparentImage;
                    } catch (e) {
                        console.error("Failed to process image for plant:", plant.id, e);
                        newImages[plant.id] = plant.image; 
                    }
                } else {
                    newImages[plant.id] = plant.image;
                }
            }
        }
        setProcessedGardenImages(newImages);
    };
    processImages();
  }, [gardenPlants]);

  const collectionPlants = useMemo(() => {
    return collectionPlantIds
      .map(id => allPlants[id])
      .filter(Boolean)
      .sort((a,b) => b.level - a.level);
  }, [collectionPlantIds, allPlants]);

  const handleSelectPlantForCare = (plant: Plant) => {
    setActiveCarePlant(allPlants[plant.id]);
    playSfx('tap');
  };

  const handleOpenSwapDialog = (plantId: number | null, index: number) => {
      setSwapState({ plantToReplaceId: plantId, gardenPlotIndex: index });
      playSfx('tap');
  };

  const handleCloseSwapDialog = () => {
    setSwapState(null);
  };
  
  const handlePlantSwap = async (newPlantId: number) => {
    if (!swapState || !user) return;
    
    const { plantToReplaceId, gardenPlotIndex } = swapState;
    
    // Create copies of the current state
    const newGardenIds = [...gardenPlantIds];
    let newCollectionIds = [...collectionPlantIds];
    
    // Place new plant into the garden
    newGardenIds[gardenPlotIndex] = newPlantId;
    
    // Remove new plant from collection
    newCollectionIds = newCollectionIds.filter(id => id !== newPlantId);
    
    // Add the old plant (if there was one) back to the collection
    if (plantToReplaceId) {
        newCollectionIds.push(plantToReplaceId);
    }
    
    try {
        await updateGardenArrangement(user.uid, newCollectionIds, newGardenIds);
        playSfx('success');
        toast({
            title: "Garden Updated",
            description: "Your plant has been placed in the garden."
        });
    } catch (e) {
        console.error("Failed to update garden arrangement", e);
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your garden changes." });
    } finally {
        handleCloseSwapDialog();
    }
  };

  const handleUseSprinkler = async () => {
    if (!user) return;
    setIsUsingSprinkler(true);
    playSfx('watering');
    try {
        const { plantsWatered, goldGained, newlyEvolvablePlants } = await useSprinkler(user.uid);
        if (plantsWatered > 0) {
            toast({
                title: "Sprinkler Used!",
                description: `You watered ${plantsWatered} plant(s) and earned ${goldGained} gold.`,
            });
            if (newlyEvolvablePlants.length > 0) {
                setTimeout(() => {
                    toast({
                        title: "Plants Ready to Evolve!",
                        description: `${newlyEvolvablePlants.length} of your plants are now ready for evolution.`,
                    });
                }, 1000);
            }
        } else {
            toast({
                title: "All Plants Watered",
                description: "Your plants have already been fully watered for the day.",
            });
        }
    } catch (e: any) {
        console.error("Failed to use sprinkler", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Could not use the sprinkler." });
    } finally {
        setIsUsingSprinkler(false);
    }
  };

  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
      <div 
        className="min-h-screen bg-contain bg-bottom bg-no-repeat flex flex-col"
        style={{backgroundImage: "url('/garden-bg-sky.png')"}}
      >
        <header className="flex flex-row items-center justify-between gap-2 p-2 sm:p-4 text-center bg-background/80 backdrop-blur-sm shrink-0 flex-wrap">
            <h1 className="text-2xl text-primary font-bold">My Garden</h1>
             <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" asChild>
                    <Link href="/garden">
                        <Sprout className="mr-2 h-4 w-4" />
                        Plants
                    </Link>
                </Button>
                <Button size="sm" asChild>
                    <Link href="/garden/seeds">
                        Seeds
                        <ChevronsRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                 {gameData.sprinklerUnlocked && (
                    <Button size="sm" onClick={handleUseSprinkler} disabled={isUsingSprinkler}>
                        {isUsingSprinkler ? <Loader2 className="animate-spin" /> : <Droplets />}
                    </Button>
                )}
            </div>
        </header>
        
        <main className="flex-grow flex flex-col justify-end p-2">
            <div className="w-full max-w-4xl mx-auto relative">
                <Image 
                    src="/garden-bg.png" 
                    alt="Garden plots" 
                    width={1024} 
                    height={512} 
                    className="w-full h-auto"
                />

                <div className="absolute inset-0 top-[5%] left-[4%] right-[4%] bottom-[10%]">
                    <div className="grid grid-cols-3 grid-rows-4 h-full w-full gap-x-[8%] gap-y-[10%]">
                        {gardenPlants.map((plant, index) => {
                             const isInFirstTwoRows = index < 6;
                             return plant ? (
                                 <PlantCard 
                                    key={plant.id} 
                                    plant={plant} 
                                    onClick={() => handleSelectPlantForCare(allPlants[plant.id])} 
                                    processedImage={plant ? processedGardenImages[plant.id] : null}
                                    className={cn(isInFirstTwoRows && "mt-[-5px]")}
                                  />
                             ) : (
                                 <EmptyPlotCard key={`empty-${index}`} onClick={() => handleOpenSwapDialog(null, index)} className={cn(isInFirstTwoRows && "mt-[-5px]")}/>
                             )
                         })}
                    </div>
                </div>
            </div>
        </main>

        {activeCarePlant && (
          <PlantCareDialog
              plant={allPlants[activeCarePlant.id]}
              open={!!activeCarePlant}
              onOpenChange={(isOpen) => !isOpen && setActiveCarePlant(null)}
              onStartEvolution={() => {}} // Evolution handled in care dialog
              onSwapRequest={(plantId, index) => handleOpenSwapDialog(plantId, index)}
          />
        )}
        
        {swapState && (
            <PlantSwapDialog
                open={!!swapState}
                onOpenChange={handleCloseSwapDialog}
                collectionPlants={collectionPlants}
                onSelectPlant={handlePlantSwap}
            />
        )}
      </div>
  );
 