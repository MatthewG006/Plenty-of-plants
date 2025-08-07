
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Loader2, Sparkles, Star, GripVertical, Gem, MessageCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor
} from '@dnd-kit/core';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { updatePlant, useSheen, useRainbowGlitter, useGlitter, useRedGlitter, updatePlantArrangement, unlockPlantChat, addConversationHistory, deletePlant } from '@/lib/firestore';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import { updateApplyGlitterProgress, updateApplySheenProgress } from '@/lib/challenge-manager';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription as AlertDialogDescriptionComponent } from '@/components/ui/alert-dialog';
import { PlantDetailDialog, EvolveConfirmationDialog, EvolvePreviewDialog, PlantChatDialog } from '@/components/plant-dialogs';
import { evolvePlantAction } from '@/app/actions/evolve-plant';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const NUM_POTS = 3;


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

function PlantImageUI({ plant, image }: { plant: Plant, image: string | null }) {
  return (
    <div className={cn("flex items-center justify-center p-1 rounded-lg pointer-events-none w-full h-full")}>
      <div className="relative h-32 w-32 sm:h-36 sm:w-36 flex items-center justify-center">
        {image && image !== 'placeholder' ? (
            <Image 
                src={image} 
                alt={plant.name} 
                fill 
                sizes="144px" 
                className="object-contain"
                data-ai-hint={plant.hint} />
        ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg">
              <Leaf className="w-12 h-12 text-transparent" />
            </div>
        )}
        {plant.hasGlitter && <GlitterAnimation />}
        {plant.hasRedGlitter && <RedGlitterAnimation />}
        {plant.hasSheen && <SheenAnimation />}
        {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
      </div>
    </div>
  );
}

function DraggableDeskPlant({ plant, ...rest }: { plant: Plant; } & React.HTMLAttributes<HTMLDivElement>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `desk:${plant.id}`,
        data: { plant, source: 'desk' },
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} {...rest} className={cn(rest.className, "cursor-grab active:cursor-grabbing")}>
            <PlantImageUI plant={plant} image={plant.image} />
        </div>
    );
}

function DeskPot({ plant, index, onClickPlant, processedImage }: { plant: Plant | null, index: number, onClickPlant: (plant: Plant) => void, processedImage: string | null }) {
    const { setNodeRef, isOver } = useDroppable({ id: `pot:${index}` });
    
    const EmptyPot = () => (
        <div ref={setNodeRef} className={cn(
            "relative w-full h-full flex items-center justify-center rounded-lg transition-colors",
            isOver ? "bg-black/20" : "bg-black/10"
        )} />
    );

    if (!plant) {
        return <EmptyPot />;
    }
    
    return (
        <div 
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => onClickPlant(plant)}
        >
            <DraggableDeskPlant 
                plant={{...plant, image: processedImage || plant.image}}
                className="w-full h-full z-10" 
            />
            <div ref={setNodeRef} className={cn("absolute inset-0 z-0", isOver && "bg-black/20 rounded-lg")} />
        </div>
    );
}

function PlantCardUI({ plant }: { plant: Plant }) {
    return (
        <Card className="group overflow-hidden shadow-md w-full relative">
            <CardContent className="p-0">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30">
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
                <div className="p-2 text-center bg-white/50 space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function DraggablePlantCard({ plant, ...props }: { plant: Plant } & React.HTMLAttributes<HTMLDivElement>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `collection:${plant.id}`,
        data: { plant, source: 'collection' },
    });

    const style = {
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        ...props.style,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} {...props} className={cn(props.className, "cursor-grab active:cursor-grabbing")}>
            <PlantCardUI plant={plant} />
        </div>
    );
}

function DroppableCollectionArea({ children }: { children: React.ReactNode }) {
    const { isOver, setNodeRef } = useDroppable({ id: 'collection:area' });
    return (
        <div
            ref={setNodeRef}
            className={cn("rounded-lg border bg-muted/10 p-2 min-h-24", isOver && "bg-primary/10 border-2 border-dashed border-primary/50")}
        >
            {children}
        </div>
    );
}


export default function RoomPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  
  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);
  const [deskPlantIds, setDeskPlantIds] = useState<(number | null)[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);
  const [sortOption, setSortOption] = useState<'level' | 'stage'>('level');

  const [processedDeskImages, setProcessedDeskImages] = useState<Record<number, string | null>>({});

  const [currentEvolvingPlant, setCurrentEvolvingPlant] = useState<Plant | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolvedPreviewData, setEvolvedPreviewData] = useState<{plantId: number; plantName: string; newForm: string, newImageUri: string, personality?: string } | null>(null);

  // For Plant Chat
  const [chattingPlant, setChattingPlant] = useState<Plant | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require a 5px drag to trigger, allows for clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Require a 150ms press
        tolerance: 5, // Allow 5px of movement during the press
      },
    })
  );
  
  useEffect(() => {
    if (gameData) {
        setCollectionPlantIds(gameData.collectionPlantIds || []);
        setDeskPlantIds(gameData.deskPlantIds || Array(NUM_POTS).fill(null));
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);

  const collectionPlants = useMemo(() => {
    const formOrder: { [key: string]: number } = { 'Base': 0, 'Evolved': 1, 'Final': 2 };
    
    // Display all plants except those on the desk.
    return Object.values(allPlants)
      .filter(plant => !deskPlantIds.includes(plant.id))
      .sort((a,b) => {
          if (sortOption === 'level') {
              return b.level - a.level;
          } else {
              return formOrder[b.form] - formOrder[a.form];
          }
      });
  }, [allPlants, deskPlantIds, sortOption]);

  const deskPlants = useMemo(() => deskPlantIds.map(id => id ? allPlants[id] : null), [deskPlantIds, allPlants]);
  
  useEffect(() => {
    const processImages = async () => {
        const newImages: Record<number, string | null> = {};
        for (const plant of deskPlants) {
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
        setProcessedDeskImages(newImages);
    };
    processImages();
  }, [deskPlants]);


  const activeDragData = useMemo(() => {
    if (!activeDragPlant) return null;
    const { id, source } = activeDragPlant as any;
    const plant = allPlants[id];
    let image = plant?.image;
    if(source === 'desk' && plant && processedDeskImages[plant.id]) {
        image = processedDeskImages[plant.id] ?? plant.image;
    }
    return plant ? { plant, source, image } : null;
  }, [activeDragPlant, allPlants, processedDeskImages]);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragPlant(event.active.data.current?.plant);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragPlant(null);
    if (!user || !gameData) return;

    const { active, over } = event;
  
    if (!over || !active.data.current?.plant) {
      return;
    }
  
    const activePlant = active.data.current.plant as Plant;
    const [activeSource] = (active.id as string).split(':');
    
    const [overType, overIdStr] = (over.id as string).split(':');
    
    let newDeskIds = [...deskPlantIds];
    const newCollectionIds = [...collectionPlantIds];

    if (overType === 'pot') { // desk to desk, or collection to desk
        const potIndex = parseInt(overIdStr, 10);
        const plantInPotId = newDeskIds[potIndex];

        // Add dragged plant to pot
        newDeskIds[potIndex] = activePlant.id;
        
        if (activeSource === 'desk') {
            const sourcePotIndex = newDeskIds.findIndex(id => id === activePlant.id);
            if (sourcePotIndex !== -1 && sourcePotIndex !== potIndex) {
                 newDeskIds[sourcePotIndex] = plantInPotId; // Swap
            }
        } else { // from collection
             if (plantInPotId) {
                newCollectionIds.push(plantInPotId);
            }
        }
         const finalCollectionIds = collectionPlantIds.filter(id => id !== activePlant.id);
         if (plantInPotId) {
            finalCollectionIds.push(plantInPotId)
         }
         await updatePlantArrangement(user.uid, finalCollectionIds, newDeskIds);

    } else if (overType === 'collection' && activeSource === 'desk') { // desk to collection
        const sourcePotIndex = newDeskIds.findIndex(id => id === activePlant.id);
        if (sourcePotIndex !== -1) {
             newDeskIds[sourcePotIndex] = null;
        }
        if (!newCollectionIds.includes(activePlant.id)) {
            newCollectionIds.push(activePlant.id);
        }
        await updatePlantArrangement(user.uid, newCollectionIds, newDeskIds);
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
        const plantToUpdateId = evolvedPreviewData.plantId;
        const { newImageUri, newForm, personality } = evolvedPreviewData;
        
        const currentPlant = allPlants[plantToUpdateId];

        const updateData: Partial<Plant> = {
            image: newImageUri,
            form: newForm,
            personality: personality || '',
        };
        
        if (newForm === 'Evolved' && currentPlant && !currentPlant.baseImage) {
            updateData.baseImage = currentPlant.image;
        }

        await updatePlant(user.uid, plantToUpdateId, updateData);
        
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
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd} 
        onDragCancel={() => setActiveDragPlant(null)}
    >
      <div className="space-y-4 bg-white min-h-screen">
        <header className="flex flex-col items-center gap-2 p-4 text-center">
          <h1 className="text-3xl text-primary text-center">My Room</h1>
          <p className="text-muted-foreground text-sm">Click a plant to see its details. Drag it to move.</p>
        </header>

         <section className="px-4">
            <div className="flex justify-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-yellow-100/80 border border-yellow-300/80">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span>{gameData.glitterCount}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-100/80 border border-blue-300/80">
                    <Star className="w-5 h-5 text-blue-500" />
                    <span>{gameData.sheenCount}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pink-100/80 border border-pink-300/80">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    <span>{gameData.rainbowGlitterCount}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-100/80 border border-red-300/80">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <span>{gameData.redGlitterCount}</span>
                </div>
            </div>
        </section>

        <section 
            className="relative h-48 max-w-lg mx-auto rounded-lg bg-cover bg-center" 
            style={{backgroundImage: "url('/desk.jpg')"}}
        >
            <div className="absolute inset-x-0 top-0 h-40 p-4 sm:p-6 md:p-8 grid grid-cols-3 grid-rows-1 gap-2">
                {deskPlants.slice(0, 3).map((plant, index) => {
                    return (
                        <DeskPot
                            key={plant?.id || `pot-${index}`}
                            plant={plant}
                            index={index}
                            onClickPlant={(p) => setSelectedPlant(allPlants[p.id])}
                            processedImage={plant ? processedDeskImages[plant.id] : null}
                        />
                    )
                })}
            </div>
        </section>

        <section className="px-4 pb-24">
            <Card className="p-4">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-full flex justify-between items-center mb-2">
                    <h2 className="text-xl text-primary">My Collection</h2>
                    <Select value={sortOption} onValueChange={(value: 'level' | 'stage') => setSortOption(value)}>
                      <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="level">Sort by Level</SelectItem>
                        <SelectItem value="stage">Sort by Stage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <DroppableCollectionArea>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                    {collectionPlants.length > 0 ? (
                      collectionPlants.map((plant) => (
                        <DraggablePlantCard 
                            key={plant.id} 
                            plant={plant}
                            onClick={() => {
                                setSelectedPlant(allPlants[plant.id]);
                            }}
                        />
                      ))
                    ) : (
                      <div className="col-span-3 text-center text-muted-foreground py-8">
                          Your collection is empty. Go to the Home screen to draw a new plant!
                      </div>
                    )}
                </div>
            </DroppableCollectionArea>
            </Card>
        </section>

        <PlantDetailDialog
          plant={selectedPlant ? allPlants[selectedPlant.id] : null}
          open={!!selectedPlant}
          onOpenChange={(isOpen) => !isOpen && setSelectedPlant(null)}
          onStartEvolution={(plant) => setCurrentEvolvingPlant(plant)}
          onOpenChat={(plant) => setChattingPlant(plant)}
          userId={user.uid}
        />
        
        <PlantChatDialog
            plant={chattingPlant}
            open={!!chattingPlant}
            onOpenChange={(isOpen) => {
                if (!isOpen) setChattingPlant(null);
            }}
            userId={user.uid}
        />

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
        
        <DragOverlay>
          {activeDragPlant ? (
             <div className="w-28 h-28">
                <PlantCardUI plant={activeDragPlant} />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

    