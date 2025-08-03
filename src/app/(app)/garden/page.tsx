
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Loader2, Droplet, Coins, Sparkles, Droplets, Gem } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { updateUserGold, updateUserRubies, updatePlant, getPlantById } from '@/lib/firestore';
import { updateWateringProgress, updateEvolutionProgress, updateWaterEvolvedProgress } from '@/lib/challenge-manager';
import { EvolveConfirmationDialog, EvolvePreviewDialog } from '@/components/plant-dialogs';
import { evolvePlantAction } from '@/app/actions/evolve-plant';


const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 5;
const RUBIES_PER_WATERING = 1;
const EVOLUTION_LEVEL = 10;
const SECOND_EVOLUTION_LEVEL = 25;

// Helper to check if a timestamp is from the current day
function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}

function GlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
                <Sparkles key={i} className="absolute text-yellow-300 animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    width: `${5 + Math.random() * 5}px`,
                    height: `${5 + Math.random() * 5}px`,
                }} />
            ))}
        </div>
    );
}

function RedGlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
                <Sparkles key={i} className="absolute text-red-500 animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    width: `${8 + Math.random() * 8}px`,
                    height: `${8 + Math.random() * 8}px`,
                }} />
            ))}
        </div>
    );
}

function SheenAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
            <div className="absolute -top-1/2 w-1/12 h-[200%] bg-white/30 animate-sheen" />
        </div>
    )
}

function RainbowGlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
                <Sparkles key={i} className="absolute animate-sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    color: `hsl(${Math.random() * 360}, 100%, 70%)`,
                    width: `${5 + Math.random() * 5}px`,
                    height: `${5 + Math.random() * 5}px`,
                }} />
            ))}
        </div>
    );
}


function PlantCard({ plant, onWater, onStartEvolution, isWatering }: { plant: Plant; onWater: (plant: Plant) => void; onStartEvolution: (plant: Plant) => void; isWatering: boolean }) {
    const timesWateredToday = plant.lastWatered?.filter(isToday).length ?? 0;
    const canWater = timesWateredToday < MAX_WATERINGS_PER_DAY;
    
    return (
        <Card className="group overflow-hidden shadow-md w-full relative bg-white/70 backdrop-blur-sm">
            <CardContent className="p-2 space-y-2">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30 rounded-md">
                    {plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                    {plant.hasGlitter && <GlitterAnimation />}
                    {plant.hasRedGlitter && <RedGlitterAnimation />}
                    {plant.hasSheen && <SheenAnimation />}
                    {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                </div>

                <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-xs text-muted-foreground">Lvl {plant.level}</div>
                    <Progress value={(plant.xp / XP_PER_LEVEL) * 100} className="h-1.5" />
                </div>
                
                <Button 
                    size="sm"
                    className="w-full"
                    onClick={() => onWater(plant)}
                    disabled={!canWater || isWatering}
                >
                    <Droplet className="mr-1 h-3 w-3" />
                    {isWatering ? "Watering..." : `Water (${timesWateredToday}/${MAX_WATERINGS_PER_DAY})`}
                </Button>
            </CardContent>
        </Card>
    );
}


export default function GardenPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  
  const [isWatering, setIsWatering] = useState(false);
  const [currentEvolvingPlant, setCurrentEvolvingPlant] = useState<Plant | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolvedPreviewData, setEvolvedPreviewData] = useState<{plantId: number; plantName: string; newForm: string, newImageUri: string, personality?: string } | null>(null);

  const allPlants = useMemo(() => {
    if (!gameData?.plants) return [];
    return Object.values(gameData.plants).sort((a,b) => b.level - a.level);
  }, [gameData]);

  const handleWaterPlant = async (plant: Plant) => {
    if (!user) return;
    
    setIsWatering(true);
    playSfx('watering');
    
    const isFinalForm = plant.form === 'Final';
    
    const xpGained = XP_PER_WATERING;
    let newXp = plant.xp + xpGained;
    let newLevel = plant.level;
    let shouldEvolve = false;

    while(newXp >= XP_PER_LEVEL) {
        newXp -= XP_PER_LEVEL;
        newLevel += 1;
        playSfx('reward');
        toast({
            title: "Level Up!",
            description: `${plant.name} has reached level ${newLevel}!`,
        });
    }

    if ((newLevel >= EVOLUTION_LEVEL && plant.form === 'Base') || (newLevel >= SECOND_EVOLUTION_LEVEL && plant.form === 'Evolved')) {
        shouldEvolve = true;
    }
    
    const now = Date.now();
    let updatedLastWatered = [...(plant.lastWatered || []), now];

    try {
        const updatedPlantData = {
            xp: newXp,
            level: newLevel,
            lastWatered: updatedLastWatered,
        };

        await updatePlant(user.uid, plant.id, updatedPlantData);
        
        if (isFinalForm) {
            await updateUserRubies(user.uid, RUBIES_PER_WATERING);
        } else {
            await updateUserGold(user.uid, GOLD_PER_WATERING);
        }
        
        if (plant.form === 'Evolved' || plant.form === 'Final') {
            await updateWaterEvolvedProgress(user.uid);
        } else {
            await updateWateringProgress(user.uid);
        }

        if (shouldEvolve) {
            const fullPlant = { ...plant, ...updatedPlantData };
            setCurrentEvolvingPlant(fullPlant);
        }

    } catch(e) {
        console.error("Failed to update plant or gold", e);
        toast({ variant: 'destructive', title: "Error", description: "Could not save watering progress."})
    } finally {
        setIsWatering(false);
    }
  };
  
  const handleEvolve = async () => {
    if (!currentEvolvingPlant || !user) return;
    
    setIsEvolving(true);
    try {
        const evolutionPlant = { ...currentEvolvingPlant };
        
        const { newImageDataUri, personality } = await evolvePlantAction({
            name: evolutionPlant.name,
            baseImageDataUri: evolutionPlant.baseImage || evolutionPlant.image,
            form: evolutionPlant.form,
        });

        const isFirstEvolution = evolutionPlant.form === 'Base';
        const newForm = isFirstEvolution ? 'Evolved' : 'Final';

        setEvolvedPreviewData({ 
            plantId: evolutionPlant.id,
            plantName: evolutionPlant.name, 
            newForm,
            newImageUri: newImageDataUri,
            personality
        });

    } catch (e) {
        console.error("Evolution failed", e);
        toast({ variant: 'destructive', title: "Evolution Failed", description: "Could not evolve your plant. Please try again." });
    } finally {
        setIsEvolving(false);
        setCurrentEvolvingPlant(null);
    }
  };
  
  const handleConfirmEvolution = async () => {
    if (!user || !evolvedPreviewData || !gameData) return;
    
    try {
        playSfx('success');
        const plantToUpdateId = evolvedPreviewData.plantId;
        const { newImageUri, newForm, personality } = evolvedPreviewData;
        
        const currentPlant = gameData.plants[plantToUpdateId];

        const updateData: Partial<Plant> = {
            image: newImageUri,
            form: newForm,
            personality: personality || '',
        };
        
        if (newForm === 'Evolved' && currentPlant && !currentPlant.baseImage) {
            updateData.baseImage = currentPlant.image;
        }

        await updatePlant(user.uid, plantToUpdateId, updateData);
        await updateEvolutionProgress(user.uid);
        
        toast({
            title: "Evolution Complete!",
            description: `${evolvedPreviewData.plantName} has evolved!`,
        });

    } catch (e) {
        console.error("Failed to save evolution", e);
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your evolved plant." });
    } finally {
        setIsEvolving(false);
        setEvolvedPreviewData(null);
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
    <div className="relative min-h-screen w-full bg-contain bg-center bg-no-repeat" style={{backgroundImage: "url('/garden-bg.png')"}}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div className="relative z-10 p-4 space-y-4">
            <header className="flex flex-col items-center gap-2 p-4 text-center">
              <h1 className="text-3xl text-white font-bold [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">My Garden</h1>
              <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Water your plants to help them level up and evolve.</p>
            </header>

            <section>
                 {allPlants.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                        {allPlants.map(plant => (
                            <PlantCard 
                                key={plant.id}
                                plant={plant}
                                onWater={handleWaterPlant}
                                onStartEvolution={(p) => setCurrentEvolvingPlant(p)}
                                isWatering={isWatering}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-10 bg-white/70 backdrop-blur-sm">
                      <CardContent>
                        <p className="text-muted-foreground">Your garden is empty. Go home to draw some new plants!</p>
                      </CardContent>
                    </Card>
                )}
            </section>
        </div>
        
        <EvolveConfirmationDialog
            plant={currentEvolvingPlant}
            open={!!currentEvolvingPlant && !isEvolving}
            onConfirm={handleEvolve}
            onCancel={() => setCurrentEvolvingPlant(null)}
            isEvolving={isEvolving}
        />

        {evolvedPreviewData && (
            <EvolvePreviewDialog
                plantName={evolvedPreviewData.plantName}
                newForm={evolvedPreviewData.newForm}
                newImageUri={evolvedPreviewData.newImageUri}
                open={!!evolvedPreviewData}
                onConfirm={handleConfirmEvolution}
            />
        )}
    </div>
  );
}
