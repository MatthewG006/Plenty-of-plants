'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Loader2, Sparkles, Star, LayoutGrid, LogIn } from 'lucide-react';
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
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useAuth } from '@/context/AuthContext';
import { updatePlantArrangement, updatePlant } from '@/lib/firestore';
import { PlantDetailDialog, PlantChatDialog } from '@/components/plant-dialogs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import { getImageDataUriAction } from '@/app/actions/image-actions';
import Link from 'next/link';


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
                data-ai-hint={plant.hint}
                unoptimized
            />
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

function CollectionPlantCard({ plant, onClick }: { plant: Plant, onClick: (plant: Plant) => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `collection:${plant.id}`,
        data: { plant, source: 'collection' },
    });

    return (
        <Card 
            ref={setNodeRef}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            className="touch-none cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={() => onClick(plant)}
        >
            <div className="group overflow-hidden shadow-md w-full relative pointer-events-none">
                <CardContent className="p-0">
                    <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                      {plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} unoptimized />
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
            </div>
        </Card>
    );
}

function DraggableDeskPlant({ plant, image, ...rest }: { plant: Plant, image: string } & React.HTMLAttributes<HTMLDivElement>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `desk:${plant.id}`,
        data: { plant, source: 'desk' },
    });

    return (
        <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }} {...listeners} {...attributes} {...rest} className={cn(rest.className, "cursor-grab active:cursor-grabbing touch-none w-full h-full z-10")}>
             <div className={cn("flex items-center justify-center p-1 rounded-lg pointer-events-none w-full h-full")}>
              <div className="relative h-32 w-32 sm:h-36 sm:w-36 flex items-center justify-center">
                {image && image !== 'placeholder' ? (
                    <Image 
                        src={image} 
                        alt={plant.name} 
                        fill 
                        sizes="144px" 
                        className="object-contain [mix-blend-mode:multiply]"
                        data-ai-hint={plant.hint}
                        unoptimized
                    />
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
            className="relative w-full h-full flex items-center justify-center"
        >
            <DraggableDeskPlant
                plant={plant}
                image={processedImage || plant.image}
                onClick={() => onClickPlant(plant)}
            />
            <div ref={setNodeRef} className={cn("absolute inset-0 z-0", isOver && "bg-black/20 rounded-lg")} />
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
  const { user, gameData, loading } = useAuth();
  
  const [deskPlantIds, setDeskPlantIds] = useState<(number | null)[]>([]);
  const [processedDeskImages, setProcessedDeskImages] = useState<Record<string, string>>({});
  
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);
  const [sortOption, setSortOption] = useState<'level' | 'stage'>('level');
  
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [chattingPlant, setChattingPlant] = useState<Plant | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );
  
  useEffect(() => {
    if (gameData) {
        setDeskPlantIds(gameData.deskPlantIds || Array(NUM_POTS).fill(null));
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);

  const deskPlants = useMemo(() => {
      return deskPlantIds.map(id => id ? allPlants[id] : null).filter(Boolean) as Plant[];
  }, [deskPlantIds, allPlants]);
  
  const collectionPlants = useMemo(() => {
    const formOrder: { [key: string]: number } = { 'Base': 0, 'Evolved': 1, 'Final': 2 };
    
    return (Object.values(allPlants) as Plant[])
      .filter(plant => !deskPlantIds.includes(plant.id))
      .sort((a,b) => {
          if (sortOption === 'level') {
              return b.level - a.level;
          } else {
              return formOrder[b.form] - formOrder[a.form];
          }
      });
  }, [allPlants, deskPlantIds, sortOption]);

  useEffect(() => {
    const processImages = async () => {
        const newImages: Record<string, string> = {};
        const processingPromises = deskPlants.map(async (plant) => {
            if (plant && plant.image && !processedDeskImages[plant.id]) {
                try {
                    const dataUri = await getImageDataUriAction(plant.image);
                    const transparentImage = await makeBackgroundTransparent(dataUri);
                    newImages[plant.id] = transparentImage;
                } catch (error) {
                    console.error(`Failed to process image for plant: ${plant.id}`, error);
                    // If processing fails, use the original image
                    newImages[plant.id] = plant.image;
                }
            }
        });

        await Promise.all(processingPromises);

        if (Object.keys(newImages).length > 0) {
            setProcessedDeskImages(currentImages => ({ ...currentImages, ...newImages }));
        }
    };

    processImages();
}, [deskPlants, processedDeskImages]);
  
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
    const currentCollectionIds = collectionPlants.map(p => p.id);

    if (overType === 'pot') {
        const potIndex = parseInt(overIdStr, 10);
        const plantInPotId = newDeskIds[potIndex];

        newDeskIds[potIndex] = activePlant.id;
        
        let newCollectionIds = [...currentCollectionIds];
        if (activeSource === 'desk') {
            const sourcePotIndex = deskPlantIds.findIndex(id => id === activePlant.id);
            if (sourcePotIndex !== -1 && sourcePotIndex !== potIndex) {
                 newDeskIds[sourcePotIndex] = plantInPotId; 
            }
        } else { 
             newCollectionIds = currentCollectionIds.filter(id => id !== activePlant.id);
        }
        if (plantInPotId) {
            if (!newCollectionIds.includes(plantInPotId)) {
                newCollectionIds.push(plantInPotId);
            }
        }
         await updatePlantArrangement(user.uid, newCollectionIds, newDeskIds);

    } else if (overType === 'collection' && activeSource === 'desk') { 
        const sourcePotIndex = deskPlantIds.findIndex(id => id === activePlant.id);
        if (sourcePotIndex !== -1) {
             newDeskIds[sourcePotIndex] = null;
        }
        let newCollectionIds = [...currentCollectionIds];
        if (!newCollectionIds.includes(activePlant.id)) {
            newCollectionIds.push(activePlant.id);
        }
        await updatePlantArrangement(user.uid, newCollectionIds, newDeskIds);
    }
  };
    
  const handleStartEvolution = (plant: Plant) => {
    // This is now handled in the garden
  }
  
  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(allPlants[plant.id]);
  };

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user || !gameData) {
    return (
        <div className="p-4 space-y-6 pb-24">
            <header className="flex flex-col items-center gap-2 p-4 text-center">
              <h1 className="text-3xl text-primary text-center">My Room</h1>
            </header>
            <Card className="text-center py-10">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full w-fit p-3 mb-2">
                        <LayoutGrid className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Arrange Your Collection</CardTitle>
                    <CardDescription>Log in to arrange your favorite plants on your desk and manage your full collection.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/login"><LogIn className="mr-2 h-4 w-4"/>Log In to View Room</Link>
                    </Button>
                </CardContent>
            </Card>
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
          <p className="text-muted-foreground text-sm">Drag plants to your desk, then click them to view details or apply cosmetics.</p>
        </header>

         <section className="px-4">
            <div className="flex justify-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-yellow-100/80 border border-yellow-300/80">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span>{gameData?.glitterCount || 0}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-100/80 border border-blue-300/80">
                    <Star className="w-5 h-5 text-blue-500" />
                    <span>{gameData?.sheenCount || 0}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pink-100/80 border border-pink-300/80">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    <span>{gameData?.rainbowGlitterCount || 0}</span>
                </div>
                 <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-100/80 border border-red-300/80">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <span>{gameData?.redGlitterCount || 0}</span>
                </div>
            </div>
        </section>

        <section 
            className="relative h-48 max-w-lg mx-auto rounded-lg bg-cover bg-center"
            style={{backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/desk.jpg?alt=media&token=0e97dc73-7fc5-478c-bcf2-ab71420179d6')`}}
        >
            <div className="absolute inset-x-0 top-0 h-40 p-4 sm:p-6 md:p-8 grid grid-cols-3 grid-rows-1 gap-2">
                {deskPlantIds.map((plantId, index) => {
                    const plant = plantId ? allPlants[plantId] : null;
                    return (
                        <DeskPot
                            key={plant?.id || `pot-${index}`}
                            plant={plant}
                            index={index}
                            onClickPlant={handleSelectPlant}
                            processedImage={plantId ? processedDeskImages[plantId] : null}
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
                        <CollectionPlantCard 
                            key={plant.id} 
                            plant={plant}
                            onClick={handleSelectPlant}
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
          plant={selectedPlant}
          open={!!selectedPlant}
          onOpenChange={(isOpen) => !isOpen && setSelectedPlant(null)}
          onStartEvolution={handleStartEvolution}
          onOpenChat={(plant) => setChattingPlant(plant)}
          userId={user.uid}
        />
        
        
        <PlantChatDialog
            plant={chattingPlant}
            open={!!chattingPlant}
            onOpenChange={(isOpen) => !isOpen && setChattingPlant(null)}
            userId={user.uid}
        />
        
        
        <DragOverlay>
          {activeDragPlant ? (
             <Card>
                <CardContent className="p-0">
                    <div className="w-28 h-28">
                         <PlantImageUI plant={activeDragPlant} image={activeDragPlant.image} />
                    </div>
                </CardContent>
             </Card>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
