

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
import Link from 'next/link';
import { getImageDataUriAction } from '@/app/actions/image-actions';
import { makeBackgroundTransparent } from '@/lib/image-compression';

const NUM_GARDEN_PLOTS = 12;

function PlantCard({ plant, onClick, className, processedImage }: { plant: Plant, onClick: (plant: Plant) => void, className?: string, processedImage: string | null }) {
    return (
        <Card className={cn("group overflow-hidden shadow-md w-full h-[120px] sm:h-[140px] relative cursor-pointer bg-white/70 backdrop-blur-sm", className)} onClick={() => onClick(plant)}>
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex-grow relative flex items-center justify-center bg-black/10">
                    {processedImage ? (
                        <Image src={processedImage} alt={plant.name} fill sizes="100px" className="object-contain p-1 [mix-blend-mode:multiply]" data-ai-hint={plant.hint} />
                    ) : plant.image && plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-contain p-1 [mix-blend-mode:multiply]" data-ai-hint={plant.hint} />
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

  const [isUsingSprinkler, setIsUsingSprinkler] = useState(false);
  const [processedGardenImages, setProcessedGardenImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gameData) {
        setCollectionPlantIds(gameData.collectionPlantIds || []);
        const currentGardenIds = gameData.gardenPlantIds || [];
        const filledGardenIds = Array.from({ length: NUM_GARDEN_PLOTS }, (_, i) => currentGardenIds[i] || null);
        setGardenPlantIds(filledGardenIds);
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);

  const gardenPlants = useMemo(() => gardenPlantIds.map(id => id ? allPlants[id] : null), [gardenPlantIds, allPlants]);
  
  const collectionPlants = useMemo(() => {
    return collectionPlantIds
      .map(id => allPlants[id])
      .filter(Boolean)
      .sort((a,b) => b.level - a.level);
  }, [collectionPlantIds, allPlants]);
  
  const gardenPlantsFiltered = useMemo(() => gardenPlants.filter(Boolean) as Plant[], [gardenPlants]);

  useEffect(() => {
    const processImages = async () => {
        const newImages: Record<string, string> = {};
        const processingPromises = gardenPlantsFiltered.map(async (plant) => {
            if (plant && plant.image && !processedGardenImages[plant.id]) {
                 try {
                    const dataUri = await getImageDataUriAction(plant.image);
                    const transparentImage = await makeBackgroundTransparent(dataUri);
                    newImages[plant.id] = transparentImage;
                } catch (error) {
                    console.error(`Failed to process image for garden plant: ${plant.id}`, error);
                    newImages[plant.id] = plant.image;
                }
            }
        });

        await Promise.all(processingPromises);

        if (Object.keys(newImages).length > 0) {
            setProcessedGardenImages(currentImages => ({ ...currentImages, ...newImages }));
        }
    };

    processImages();
  }, [gardenPlantsFiltered, processedGardenImages]);


  const availableForSwap = useMemo(() => {
    const gardenIds = new Set(gardenPlantIds.filter(id => id !== null));
    return collectionPlants.filter(plant => !gardenIds.has(plant.id));
  }, [collectionPlants, gardenPlantIds]);

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
    
    const newGardenIds = [...gardenPlantIds];
    let newCollectionIds = [...collectionPlantIds];
    
    newGardenIds[gardenPlotIndex] = newPlantId;
    
    newCollectionIds = newCollectionIds.filter(id => id !== newPlantId);
    
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
        const { plantsWatered, seedsCollected, newlyEvolvablePlants } = await useSprinkler(user.uid);
        if (plantsWatered > 0) {
            let description = `You watered ${plantsWatered} plant(s).`;
            if (seedsCollected > 0) {
                description += ` You collected ${seedsCollected} new seed(s)!`;
            }

            toast({
                title: "Sprinkler Used!",
                description: description,
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
        <header className="flex flex-col items-center gap-2 p-4 text-center bg-background/80 backdrop-blur-sm shrink-0">
            <h1 className="text-3xl text-primary font-bold">My Garden</h1>
            <p className="text-muted-foreground">Water your plants to help them grow. They might even evolve!</p>
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
                {gameData.sprinklerUnlocked && (
                    <Button onClick={handleUseSprinkler} disabled={isUsingSprinkler} className="bg-blue-500 hover:bg-blue-600">
                        {isUsingSprinkler ? <Loader2 className="animate-spin" /> : <Droplets className="mr-1.5 h-4 w-4" />}
                        Sprinkler
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
                                    className={cn(isInFirstTwoRows && "mt-[-5px]")}
                                    processedImage={processedGardenImages[plant.id] || null}
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
              onStartEvolution={() => {}} 
              onSwapRequest={(plantId, index) => handleOpenSwapDialog(plantId, index)}
          />
        )}
        
        {swapState && (
            <PlantSwapDialog
                open={!!swapState}
                onOpenChange={handleCloseSwapDialog}
                collectionPlants={availableForSwap}
                onSelectPlant={handlePlantSwap}
            />
        )}
      </div>
  );
}
