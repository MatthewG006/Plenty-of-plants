
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Loader2, Sparkles, Star, GripVertical, Gem, MessageCircle, Trash2, Replace, Plus } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { updateGardenArrangement } from '@/lib/firestore';
import { PlantCareDialog, PlantSwapDialog } from '@/components/plant-dialogs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { makeBackgroundTransparent } from '@/lib/image-compression';


const NUM_GARDEN_PLOTS = 12;

function PlantCard({ plant, onClick, processedImage }: { plant: Plant, onClick: (plant: Plant) => void, processedImage: string | null }) {
    const hasAnyCosmetic = plant.hasGlitter || plant.hasSheen || plant.hasRainbowGlitter || plant.hasRedGlitter;
    return (
        <Card className="group overflow-hidden shadow-md w-full relative cursor-pointer bg-white/70 backdrop-blur-sm" onClick={() => onClick(plant)}>
            <CardContent className="p-0">
                <div className="h-20 relative flex items-center justify-center bg-black/10">
                    {processedImage && processedImage !== 'placeholder' ? (
                        <Image src={processedImage} alt={plant.name} fill sizes="100px" className="object-contain p-1" data-ai-hint={plant.hint} />
                    ) : plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                </div>
                <div className="p-1 text-center space-y-0.5">
                    <p className="text-xs font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-[10px] text-muted-foreground">Lvl {plant.level}</div>
                    <Progress value={(plant.xp / 1000) * 100} className="h-1.5" />
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyPlotCard({ onClick }: { onClick: () => void }) {
    return (
        <Card className="group overflow-hidden shadow-md w-full relative cursor-pointer bg-black/10 backdrop-blur-sm" onClick={onClick}>
            <CardContent className="p-0">
                <div className="h-20 relative flex items-center justify-center border-2 border-dashed border-white/30">
                     <div className="text-center">
                        <Plus className="mx-auto h-8 w-8 text-white/70" />
                    </div>
                </div>
                <div className="p-1 text-center">
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

  const [sortOption, setSortOption] = useState<'level' | 'stage'>('level');
  const [processedGardenImages, setProcessedGardenImages] = useState<Record<number, string | null>>({});

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
    const formOrder: { [key: string]: number } = { 'Base': 0, 'Evolved': 1, 'Final': 2 };

    return collectionPlantIds
      .map(id => allPlants[id])
      .filter(Boolean)
      .sort((a,b) => {
          if (sortOption === 'level') {
              return b.level - a.level;
          } else {
              return formOrder[b.form] - formOrder[a.form];
          }
      });
  }, [collectionPlantIds, allPlants, sortOption]);

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

  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
      <div 
        className="min-h-screen bg-contain bg-bottom bg-no-repeat"
        style={{backgroundImage: "url('/garden-bg.png')"}}
      >
        <header className="flex flex-col items-center gap-2 p-4 text-center bg-background/80 backdrop-blur-sm">
            <h1 className="text-3xl text-primary font-bold">My Garden</h1>
            <p className="text-muted-foreground">Water your plants to help them grow. Tap a plant to care for it, or tap an empty plot to add a new plant from your collection.</p>
        </header>
        
        <main className="p-4 pb-4">
          <section className="mt-[4px] pt-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 tall:gap-8">
                 {gardenPlants.map((plant, index) => (
                     plant ? (
                         <PlantCard 
                            key={plant.id} 
                            plant={plant} 
                            onClick={() => handleSelectPlantForCare(allPlants[plant.id])} 
                            processedImage={plant ? processedGardenImages[plant.id] : null}
                          />
                     ) : (
                         <EmptyPlotCard key={`empty-${index}`} onClick={() => handleOpenSwapDialog(null, index)} />
                     )
                 ))}
              </div>
          </section>
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
}
