
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Loader2, Sparkles, GripVertical } from 'lucide-react';
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
import { updateGardenArrangement } from '@/lib/firestore';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import { EvolveConfirmationDialog, EvolvePreviewDialog, PlantCareDialog } from '@/components/plant-dialogs';
import { evolvePlantAction } from '@/app/actions/evolve-plant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DRAG_CLICK_TOLERANCE = 5; // pixels
const NUM_PLOTS = 6;

const plantPositions = [
    { top: '25%', left: '20%' }, { top: '25%', left: '50%' }, { top: '25%', left: '80%' },
    { top: '65%', left: '20%' }, { top: '65%', left: '50%' }, { top: '65%', left: '80%' },
];

function PlantImageUI({ plant, image }: { plant: Plant, image: string | null }) {
  return (
    <div className={cn("flex items-center justify-center p-1 rounded-lg pointer-events-none w-full h-full")}>
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center">
        {image && image !== 'placeholder' ? (
            <Image
                src={image}
                alt={plant.name}
                fill
                sizes="112px"
                className="object-contain"
                data-ai-hint={plant.hint} />
        ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg">
              <Leaf className="w-12 h-12 text-transparent" />
            </div>
        )}
      </div>
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
                </div>
                <div className="p-2 text-center bg-white/50 space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <div className="text-xs text-muted-foreground">Lvl {plant.level}</div>
                    <Progress value={(plant.xp / 1000) * 100} className="h-1.5" />
                </div>
            </CardContent>
        </Card>
    );
}

function GardenPlot({ plant, index, onClickPlant, processedImage }: { plant: Plant | null, index: number, onClickPlant: (plant: Plant) => void, processedImage: string | null }) {
    const { setNodeRef, isOver } = useDroppable({ id: `plot:${index}` });
    const pos = useRef([0, 0]);

    const onPointerDown = (e: React.PointerEvent) => {
        pos.current = [e.clientX, e.clientY];
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!plant) return;
        const [x, y] = pos.current;
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2));

        if (dist < DRAG_CLICK_TOLERANCE) {
             onClickPlant(plant);
        }
    };

    const EmptyPlot = () => (
        <div ref={setNodeRef} className={cn(
            "absolute w-1/5 aspect-square rounded-full bg-black/10 transition-colors",
            isOver && "bg-black/20"
        )} style={{
            ...plantPositions[index],
            transform: 'translate(-50%, -50%)',
        }} />
    );

    if (!plant) {
        return <EmptyPlot />;
    }

    return (
        <div
            className="group absolute w-1/5 aspect-square cursor-pointer transition-transform hover:scale-110"
            style={{ ...plantPositions[index], transform: 'translate(-50%, -50%)' }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
             <DraggablePlant
                plant={{...plant, image: processedImage || plant.image}}
                source="garden"
                className="cursor-grab active:cursor-grabbing w-full h-full z-10"
            />
            <div ref={setNodeRef} className={cn("absolute inset-0 z-0", isOver && "bg-black/20 rounded-full")} />
        </div>
    );
}


function DraggablePlant({ plant, source, ...rest }: { plant: Plant; source: 'garden' | 'collection'; } & React.HTMLAttributes<HTMLDivElement>) {
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
            <PlantImageUI plant={plant} image={plant.image} />
        </div>
    );
}

function DraggablePlantCard({ plant, onClick }: { plant: Plant; onClick: (plant: Plant) => void; }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `collection:${plant.id}`,
        data: { plant, source: 'collection' },
    });

    const pos = useRef([0, 0]);

    const onPointerDown = (e: React.PointerEvent) => {
        pos.current = [e.clientX, e.clientY];
        if (attributes.onPointerDown) {
            attributes.onPointerDown(e);
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        const [x, y] = pos.current;
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2));

        if (dist < DRAG_CLICK_TOLERANCE) {
             onClick(plant);
        }
    };

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            className="cursor-grab active:cursor-grabbing"
        >
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

export default function GardenPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useAudio();

  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);
  const [gardenPlantIds, setGardenPlantIds] = useState<(number | null)[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'level' | 'stage'>('level');


  const [processedGardenImages, setProcessedGardenImages] = useState<Record<number, string | null>>({});

  const [currentEvolvingPlant, setCurrentEvolvingPlant] = useState<Plant | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolvedPreviewData, setEvolvedPreviewData] = useState<{plantId: number; plantName: string; newForm: string, newImageUri: string, personality?: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
        setGardenPlantIds(gameData.gardenPlantIds || Array(NUM_PLOTS).fill(null));
    }
  }, [gameData]);


  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);

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

  const gardenPlants = useMemo(() => gardenPlantIds.map(id => id ? allPlants[id] : null), [gardenPlantIds, allPlants]);

  useEffect(() => {
    const processImages = async () => {
        const newImages: Record<number, string | null> = {};
        for (const plant of gardenPlants) {
            if (plant && plant.image && !plant.image.startsWith('/')) { // Don't process local placeholders
                try {
                    const transparentImage = await makeBackgroundTransparent(plant.image);
                    newImages[plant.id] = transparentImage;
                } catch (e) {
                    console.error("Failed to process image for plant:", plant.id, e);
                    newImages[plant.id] = plant.image; // fallback to original
                }
            } else if (plant) {
                newImages[plant.id] = plant.image;
            }
        }
        setProcessedGardenImages(newImages);
    };

    if (gardenPlants.length > 0) {
        processImages();
    }
  }, [gardenPlants]);


  const activeDragData = useMemo(() => {
    if (!activeDragId) return null;
    const [source, idStr] = activeDragId.split(":");
    const id = parseInt(idStr, 10);
    const plant = allPlants[id];
    let image = plant?.image;
    if(source === 'garden' && plant && processedGardenImages[plant.id]) {
        image = processedGardenImages[plant.id] ?? plant.image;
    }
    return plant ? { plant, source, image } : null;
  }, [activeDragId, allPlants, processedGardenImages]);

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

    let newGardenIds = [...gardenPlantIds];
    const newCollectionIds = [...collectionPlantIds];

    if (overType === 'plot') { // garden to garden, or collection to garden
        const plotIndex = parseInt(overIdStr, 10);
        const plantInPlotId = newGardenIds[plotIndex];

        // Add dragged plant to plot
        newGardenIds[plotIndex] = activePlant.id;

        if (activeSource === 'garden') {
            const sourcePlotIndex = newGardenIds.findIndex(id => id === activePlant.id);
            if (sourcePlotIndex !== -1 && sourcePlotIndex !== plotIndex) {
                 newGardenIds[sourcePlotIndex] = plantInPlotId; // Swap
            }
        } else { // from collection
             if (plantInPlotId) {
                newCollectionIds.push(plantInPlotId);
            }
        }
         const finalCollectionIds = collectionPlantIds.filter(id => id !== activePlant.id);
         if (plantInPlotId) {
            finalCollectionIds.push(plantInPlotId)
         }
         await updateGardenArrangement(user.uid, finalCollectionIds, newGardenIds);

    } else if (overType === 'collection' && activeSource === 'garden') { // garden to collection
        const sourcePlotIndex = newGardenIds.findIndex(id => id === activePlant.id);
        if (sourcePlotIndex !== -1) {
             newGardenIds[sourcePlotIndex] = null;
        }
        if (!newCollectionIds.includes(activePlant.id)) {
            newCollectionIds.push(activePlant.id);
        }
        await updateGardenArrangement(user.uid, newCollectionIds, newGardenIds);
    }
  };


  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(allPlants[plant.id]);
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

        const currentPlant = allPlants[plantToUpdateId];

        const updateData: Partial<Plant> = {
            image: newImageUri,
            form: newForm,
            personality: personality || '',
        };

        if (newForm === 'Evolved' && currentPlant && !currentPlant.baseImage) {
            updateData.baseImage = currentPlant.image;
        }

        await updateGardenArrangement(user.uid, collectionPlantIds, gardenPlantIds);

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
        onDragCancel={() => setActiveDragId(null)}
    >
      <div className="min-h-screen flex flex-col bg-white pb-24">
        <header className="flex flex-col items-center gap-2 px-4 pt-4 text-center z-20 relative bg-background mb-4">
          <h1 className="text-3xl text-primary font-bold">My Garden</h1>
          <p className="text-muted-foreground">Water your plants and arrange your garden.</p>
        </header>

        <div className="flex-grow relative px-2">
          <div
              className="absolute inset-0 -z-10 h-full w-full bg-no-repeat"
              style={{
                  backgroundImage: "url('/garden-bg.png')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }}
          />

          <div className="relative z-10 mx-auto max-w-lg w-full aspect-[9/12]">
              <section>
                {gardenPlants.map((plant, index) => (
                  <GardenPlot
                    key={plant?.id || `plot-${index}`}
                    plant={plant}
                    index={index}
                    onClickPlant={handleSelectPlant}
                    processedImage={plant ? processedGardenImages[plant.id] : null}
                  />
                ))}
              </section>
            </div>
        </div>

        <section className="px-4 pt-4 bg-background">
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
                               onClick={handleSelectPlant}
                             />
                          ))
                    ) : (
                      <div className="col-span-3 text-center text-muted-foreground py-8">
                          Your collection is empty.
                      </div>
                    )}
                </div>
              </DroppableCollectionArea>
            </Card>
        </section>

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
              plant={allPlants[selectedPlant.id]}
              open={!!selectedPlant}
              onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}
              onStartEvolution={(plant) => setCurrentEvolvingPlant(plant)}
          />
        )}

        <DragOverlay>
            {activeDragData ? (
                activeDragData.source === 'collection' ? (
                    <div className="w-28">
                        <PlantCardUI plant={activeDragData.plant} />
                    </div>
                ) : (
                    <div className="w-28 h-28">
                       <PlantImageUI plant={activeDragData.plant} image={activeDragData.image} />
                    </div>
                )
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

    