
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Leaf, Loader2, Sparkles, Star } from 'lucide-react';
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
import { updatePlant, useGlitter, useSheen, useRainbowGlitter, useRedGlitter, updatePlantArrangement, NUM_POTS } from '@/lib/firestore';
import { updateApplyGlitterProgress } from '@/lib/challenge-manager';

const XP_PER_LEVEL = 1000;
const DRAG_CLICK_TOLERANCE = 5; // pixels

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


function PlantCardUI({ 
    plant,
    onApplyGlitter, 
    canApplyGlitter,
    onApplySheen, 
    canApplySheen,
    onApplyRainbowGlitter,
    canApplyRainbowGlitter,
    onApplyRedGlitter,
    canApplyRedGlitter
}: { 
    plant: Plant,
    onApplyGlitter: (plantId: number) => void;
    canApplyGlitter: boolean;
    onApplySheen: (plantId: number) => void;
    canApplySheen: boolean;
    onApplyRainbowGlitter: (plantId: number) => void;
    canApplyRainbowGlitter: boolean;
    onApplyRedGlitter: (plantId: number) => void;
    canApplyRedGlitter: boolean;
}) {
    const hasAnyCosmetic = plant.hasGlitter || plant.hasSheen || plant.hasRainbowGlitter || plant.hasRedGlitter;
    return (
        <Card className="group overflow-hidden shadow-md w-full relative">
            <div className="absolute top-1 left-1 z-10 flex flex-col gap-1">
                {canApplyGlitter && !hasAnyCosmetic &&(
                    <Button
                        size="icon"
                        className="h-7 w-7 bg-yellow-400/80 text-white hover:bg-yellow-500/90"
                        onClick={() => onApplyGlitter(plant.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                )}
                {canApplySheen && !hasAnyCosmetic &&(
                    <Button
                        size="icon"
                        className="h-7 w-7 bg-blue-400/80 text-white hover:bg-blue-500/90"
                        onClick={() => onApplySheen(plant.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Star className="h-4 w-4" />
                    </Button>
                )}
                {canApplyRainbowGlitter && !hasAnyCosmetic && (
                    <Button
                        size="icon"
                        className="h-7 w-7 bg-gradient-to-r from-pink-500 to-yellow-500 text-white"
                        onClick={() => onApplyRainbowGlitter(plant.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                )}
                 {canApplyRedGlitter && !hasAnyCosmetic && (
                    <Button
                        size="icon"
                        className="h-7 w-7 bg-red-500/80 text-white hover:bg-red-600/90"
                        onClick={() => onApplyRedGlitter(plant.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                )}
            </div>
            
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
                    {plant.form === 'Evolved' && (
                        <div className="absolute top-1 right-1 bg-secondary/80 text-secondary-foreground p-1 rounded-full shadow-md backdrop-blur-sm">
                            <Sparkles className="w-2 h-2" />
                        </div>
                    )}
                </div>
                <div className="p-2 text-center bg-white/50 space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-xs text-muted-foreground">Lvl {plant.level}</div>
                    <Progress value={(plant.xp / XP_PER_LEVEL) * 100} className="h-1.5" />
                </div>
            </CardContent>
        </Card>
    );
}

function DraggablePlantCard({ plant, onApplyGlitter, canApplyGlitter, onApplySheen, canApplySheen, onApplyRainbowGlitter, canApplyRainbowGlitter, onApplyRedGlitter, canApplyRedGlitter }: { plant: Plant; onApplyGlitter: (plantId: number) => void; canApplyGlitter: boolean; onApplySheen: (plantId: number) => void; canApplySheen: boolean; onApplyRainbowGlitter: (plantId: number) => void; canApplyRainbowGlitter: boolean; onApplyRedGlitter: (plantId: number) => void; canApplyRedGlitter: boolean; }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `collection:${plant.id}`,
        data: { plant, source: 'collection' },
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
            <PlantCardUI 
                plant={plant} 
                onApplyGlitter={onApplyGlitter} 
                canApplyGlitter={canApplyGlitter}
                onApplySheen={onApplySheen}
                canApplySheen={canApplySheen}
                onApplyRainbowGlitter={onApplyRainbowGlitter}
                canApplyRainbowGlitter={canApplyRainbowGlitter}
                onApplyRedGlitter={onApplyRedGlitter}
                canApplyRedGlitter={canApplyRedGlitter}
            />
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

function DeskPot({ plant, index, onPointerDown, onPointerUp }: { plant: Plant | null, index: number, onPointerDown: (e: React.PointerEvent) => void, onPointerUp: (e: React.PointerEvent) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id: `pot:${index}` });
    
    return (
        <div 
            ref={setNodeRef} 
            className={cn("relative w-full h-full flex items-center justify-center rounded-lg transition-colors", isOver ? "bg-black/20" : "")}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            {plant && (
                <div className="w-full h-full flex items-center justify-center">
                    <DraggablePlant 
                        plant={plant} 
                        source="desk" 
                        className="cursor-grab active:cursor-grabbing w-full h-full z-10"
                    />
                </div>
            )}
        </div>
    )
}

function DraggablePlant({ plant, source, ...rest }: { plant: Plant; source: 'desk' | 'collection'; } & React.HTMLAttributes<HTMLDivElement>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${source}:${plant.id}`,
        data: { plant, source },
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} {...rest}>
            <div className={cn("flex items-center justify-center p-1 rounded-lg pointer-events-none w-full h-full")}>
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center">
                {plant.image && plant.image !== 'placeholder' ? (
                    <Image 
                        src={plant.image} 
                        alt={plant.name} 
                        fill 
                        sizes="80px" 
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
        </div>
    );
}

export default function RoomPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();
  
  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);
  const [deskPlantIds, setDeskPlantIds] = useState<(number | null)[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_CLICK_TOLERANCE,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
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
  const collectionPlants = useMemo(() => collectionPlantIds.map(id => allPlants[id]).filter(Boolean), [collectionPlantIds, allPlants]);
  const deskPlants = useMemo(() => deskPlantIds.map(id => id ? allPlants[id] : null), [deskPlantIds, allPlants]);
  
  const activeDragData = useMemo(() => {
    if (!activeDragId) return null;
    const [source, idStr] = activeDragId.split(":");
    const id = parseInt(idStr, 10);
    const plant = allPlants[id];
    return plant ? { plant, source } : null;
  }, [activeDragId, allPlants]);


  const handleDragStart = (event: DragStartEvent) => {
    playSfx('pickup');
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    playSfx('tap');
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
            const sourcePotIndex = deskPlantIds.findIndex(id => id === activePlant.id);
            if (sourcePotIndex !== -1 && sourcePotIndex !== potIndex) {
                 newDeskIds[sourcePotIndex] = plantInPotId; // Swap
            }
        } else { // from collection
             if (plantInPotId) {
                newCollectionIds.push(plantInPotId);
            }
        }
         const finalCollectionIds = collectionPlantIds.filter(id => id !== activePlant.id);
         if (plantInPotId && !finalCollectionIds.includes(plantInPotId)) {
            finalCollectionIds.push(plantInPotId)
         }
         await updatePlantArrangement(user.uid, finalCollectionIds, newDeskIds);

    } else if (overType === 'collection' && activeSource === 'desk') { // desk to collection
        const sourcePotIndex = deskPlantIds.findIndex(id => id === activePlant.id);
        if (sourcePotIndex !== -1) {
             newDeskIds[sourcePotIndex] = null;
        }
        if (!newCollectionIds.includes(activePlant.id)) {
            newCollectionIds.push(activePlant.id);
        }
        await updatePlantArrangement(user.uid, newCollectionIds, newDeskIds);
    }
  };
  
  const handleApplyGlitter = async (plantId: number) => {
    if (!user) return;
    try {
        await useGlitter(user.uid);
        await updatePlant(user.uid, plantId, { hasGlitter: true });
        await updateApplyGlitterProgress(user.uid);
        playSfx('chime');
        toast({
            title: "Sparkly!",
            description: "Your plant is now shimmering.",
        });
    } catch (e: any) {
        console.error("Failed to apply glitter", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Could not apply glitter." });
    }
  };

  const handleApplySheen = async (plantId: number) => {
    if (!user) return;
    try {
        await useSheen(user.uid);
        await updatePlant(user.uid, plantId, { hasSheen: true });
        playSfx('chime');
        toast({
            title: "Sheen applied!",
            description: "Your plant is now shimmering beautifully.",
        });
    } catch (e: any) {
        console.error("Failed to apply sheen", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Could not apply sheen." });
    }
  };
  
  const handleApplyRainbowGlitter = async (plantId: number) => {
    if (!user) return;
    try {
        await useRainbowGlitter(user.uid);
        await updatePlant(user.uid, plantId, { hasRainbowGlitter: true });
        playSfx('chime');
        toast({
            title: "Rainbow Glitter applied!",
            description: "Your plant is sparkling with all the colors.",
        });
    } catch (e: any) {
        console.error("Failed to apply rainbow glitter", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Could not apply rainbow glitter." });
    }
  };

  const handleApplyRedGlitter = async (plantId: number) => {
    if (!user) return;
    try {
        await useRedGlitter(user.uid);
        await updatePlant(user.uid, plantId, { hasRedGlitter: true });
        playSfx('chime');
        toast({
            title: "Red Glitter applied!",
            description: "Your plant is sparkling with a fiery red.",
        });
    } catch (e: any) {
        console.error("Failed to apply red glitter", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Could not apply red glitter." });
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
        onDragCancel={() => setActiveDragId(null)}
    >
      <div className="space-y-4 bg-white min-h-screen pb-24">
        <header className="flex flex-col items-center gap-4 p-4 text-center">
          <h1 className="text-3xl text-primary text-center">My Room</h1>
          <p className="text-muted-foreground">Drag plants from your collection to your Garden to water them. Apply cosmetics here.</p>
        </header>
        
        <section 
          className="relative h-48 max-w-lg mx-auto rounded-lg bg-cover bg-center" 
          style={{backgroundImage: "url('/desk-bg.png')"}}
        >
            <div className="absolute inset-0 p-4 sm:p-6 md:p-8 grid grid-cols-5 grid-rows-1 gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                    const plant = deskPlants[index];
                    return (
                        <DeskPot
                            key={plant?.id || `pot-${index}`}
                            plant={plant}
                            index={index}
                            onPointerDown={(e) => {}}
                            onPointerUp={(e) => {}}
                        />
                    )
                })}
            </div>
        </section>

        <section className="px-4 pb-4">
            <Card className="p-4">
              <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xl text-primary">My Collection</h2>
              </div>
              <DroppableCollectionArea>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                    {collectionPlants.length > 0 ? (
                      collectionPlants.map((plant) => (
                           <DraggablePlantCard
                              key={plant.id}
                               plant={plant}
                               onApplyGlitter={handleApplyGlitter}
                               canApplyGlitter={gameData.glitterCount > 0}
                               onApplySheen={handleApplySheen}
                               canApplySheen={gameData.sheenCount > 0}
                               onApplyRainbowGlitter={handleApplyRainbowGlitter}
                               canApplyRainbowGlitter={gameData.rainbowGlitterCount > 0}
                               onApplyRedGlitter={handleApplyRedGlitter}
                               canApplyRedGlitter={gameData.redGlitterCount > 0}
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

        <DragOverlay>
            {activeDragData ? (
                activeDragData.source === 'collection' ? (
                    <div className="w-28">
                        <PlantCardUI 
                            plant={activeDragData.plant} 
                            onApplyGlitter={() => {}} canApplyGlitter={false} 
                            onApplySheen={() => {}} canApplySheen={false}
                            onApplyRainbowGlitter={() => {}} canApplyRainbowGlitter={false}
                            onApplyRedGlitter={() => {}} canApplyRedGlitter={false}
                        />
                    </div>
                ) : (
                    <DraggablePlant plant={activeDragData.plant} source="desk" />
                )
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

    