
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
import { EvolveConfirmationDialog, EvolvePreviewDialog, PlantCareDialog } from '@/components/plant-dialogs';
import { evolvePlantAction } from '@/app/actions/evolve-plant';


const EVOLUTION_LEVEL = 10;
const SECOND_EVOLUTION_LEVEL = 25;


function PlantCard({ plant, onSelectPlant }: { plant: Plant; onSelectPlant: (plant: Plant) => void; }) {
    
    return (
        <Card 
            className="group overflow-hidden shadow-md w-full relative bg-white/70 backdrop-blur-sm cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onSelectPlant(plant)}
        >
            <CardContent className="p-2 space-y-2">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30 rounded-md">
                    {plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                </div>

                <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-xs text-muted-foreground">Lvl {plant.level}</div>
                    <Progress value={(plant.xp / 1000) * 100} className="h-1.5" />
                </div>
            </CardContent>
        </Card>
    );
}


export default function GardenPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [currentEvolvingPlant, setCurrentEvolvingPlant] = useState<Plant | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolvedPreviewData, setEvolvedPreviewData] = useState<{plantId: number; plantName: string; newForm: string, newImageUri: string, personality?: string } | null>(null);

  const allPlants = useMemo(() => {
    if (!gameData?.plants) return [];
    return Object.values(gameData.plants).sort((a,b) => b.level - a.level);
  }, [gameData]);

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    playSfx('tap');
  };

  const handleCloseDialog = () => {
    setSelectedPlant(null);
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
    <div className="min-h-screen">
      <header className="flex flex-col items-center gap-2 p-4 text-center z-20 relative">
        <h1 className="text-3xl text-primary font-bold">My Garden</h1>
        <p className="text-muted-foreground">Water your plants to help them level up and evolve.</p>
      </header>

      <div className="relative">
        <div className="fixed inset-0 top-0 -z-10 h-screen w-full bg-cover bg-top bg-black" style={{ backgroundImage: "url('/garden-bg.png')" }} />
        <div className="fixed inset-0 top-0 -z-10 h-screen w-full bg-contain bg-top bg-no-repeat backdrop-blur-sm" style={{ backgroundImage: "url('/garden-bg.png')" }} />
       
        <div className="relative z-10 p-4 space-y-4">
          <section>
            {allPlants.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {allPlants.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onSelectPlant={handleSelectPlant}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-10 bg-white/70 backdrop-blur-sm">
                <CardContent>
                  <p className="text-muted-foreground">
                    Your garden is empty. Go home to draw some new plants!
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
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
      
      {selectedPlant && (
        <PlantCareDialog
            plant={selectedPlant}
            open={!!selectedPlant}
            onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}
            onStartEvolution={(plant) => setCurrentEvolvingPlant(plant)}
        />
      )}
    </div>
  );
}
