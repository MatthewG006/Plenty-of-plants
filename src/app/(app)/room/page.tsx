
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { Leaf, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
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


const OLD_PLANTS_STORAGE_KEY = 'plenty-of-plants-collection';
const PLANTS_DATA_STORAGE_KEY = 'plenty-of-plants-data';
const NUM_POTS = 3;

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
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}


function PlantPot() {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-primary/70 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2.4a5.3 5.3 0 0 1-2.9 4.8 6.2 6.2 0 0 0-1.1 1.6 4.2 4.2 0 0 0-1 2.2H16a4.2 4.2 0 0 0-1-2.2 6.2 6.2 0 0 0-1.1-1.6A5.3 5.3 0 0 1 12 4.4V2Z"/><path d="M10 13H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5"/><path d="M10 13v-1.4a2.4 2.4 0 0 1 1-2.1 2.4 2.4 0 0 1 2 0 2.4 2.4 0 0 1 1 2.1V13"/></svg>
            <p className="text-xs font-semibold">Empty Pot</p>
        </div>
    )
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

function PlantDetailDialog({ plant, open, onOpenChange }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!plant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-headline text-3xl text-center">{plant.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100 flex items-center justify-center">
                        {plant.image !== 'placeholder' ? (
                            <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                        ) : (
                            <Leaf className="w-24 h-24 text-muted-foreground/50" />
                        )}
                    </div>
                    <p className="text-muted-foreground text-center mt-2">{plant.description}</p>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Form</p>
                        <p className="text-lg font-semibold text-primary">{plant.form}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PlantImageUI({ plant }: { plant: Plant }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-28 w-28 pointer-events-none flex items-center justify-center">
        {plant.image !== 'placeholder' ? (
            <Image src={plant.image} alt={plant.name} fill className="object-contain" data-ai-hint={plant.hint} />
        ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg bg-muted/20">
              <Leaf className="w-12 h-12 text-muted-foreground/50" />
            </div>
        )}
      </div>
      <p className="mt-1 text-xs font-semibold text-primary truncate w-full pointer-events-none">{plant.name}</p>
    </div>
  );
}

function PlantCardUI({ plant }: { plant: Plant }) {
    return (
        <Card className="group overflow-hidden shadow-md w-full">
            <CardContent className="p-0">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                    {plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                </div>
                <div className="p-2 text-center bg-white/50">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <p className="text-xs text-muted-foreground">{plant.form}</p>
                </div>
            </CardContent>
        </Card>
    );
}


function DraggablePlant({ plant, source, onClick }: { plant: Plant; source: 'desk' | 'collection'; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${source}:${plant.id}`,
        data: { plant, source },
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    if (source === 'desk') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                onClick={onClick}
                className="flex flex-col items-center text-center cursor-grab active:cursor-grabbing h-full w-full justify-center"
            >
                <PlantImageUI plant={plant} />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick} className="cursor-grab active:cursor-grabbing">
            <PlantCardUI plant={plant} />
        </div>
    );
}

function DroppablePot({
  plant,
  index,
  activePlantData,
  onClickPlant,
}: {
  plant: Plant | null;
  index: number;
  activePlantData: { plant: Plant; source: string } | null;
  onClickPlant: (plant: Plant) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `pot:${index}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex h-32 w-28 items-center justify-center rounded-lg transition-colors",
        isOver && "bg-primary/20"
      )}
    >
      {plant ? (
         <DraggablePlant plant={plant} source="desk" onClick={() => onClickPlant(plant)} />
      ) : isOver && activePlantData ? (
          <div className="flex flex-col items-center text-center opacity-60 pointer-events-none">
              <PlantImageUI plant={activePlantData.plant} />
          </div>
      ) : (
          <PlantPot />
      )}
    </div>
  );
}


export default function RoomPage() {
  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlant, setNewPlant] = useState<DrawPlantOutput | null>(null);
  const [collectedPlants, setCollectedPlants] = useState<Plant[]>([]);
  const [deskPlants, setDeskPlants] = useState<(Plant | null)[]>(Array(NUM_POTS).fill(null));
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

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
  
  const activePlantData = (() => {
    if (!activeId) return null;
    const [source, idStr] = activeId.split(":");
    const id = parseInt(idStr, 10);
    const plant = source === 'desk' 
        ? deskPlants.find(p => p?.id === id)
        : collectedPlants.find(p => p.id === id);
    return plant ? { plant, source } : null;
  })();

  useEffect(() => {
    try {
      const storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
      if (storedDataRaw) {
        const storedData = JSON.parse(storedDataRaw);
        if (storedData.collection && storedData.desk) {
          setCollectedPlants(storedData.collection);
          setDeskPlants(storedData.desk);
          return;
        }
      }
      
      const oldStoredPlantsRaw = localStorage.getItem(OLD_PLANTS_STORAGE_KEY);
      if (oldStoredPlantsRaw) {
        const oldPlants = JSON.parse(oldStoredPlantsRaw);
        const newDeskState = Array(NUM_POTS).fill(null);
        setCollectedPlants(oldPlants);
        setDeskPlants(newDeskState);
        localStorage.setItem(PLANTS_DATA_STORAGE_KEY, JSON.stringify({ collection: oldPlants, desk: newDeskState }));
      }
    } catch (e) {
      console.error("Failed to parse stored plants, starting fresh.", e);
      setCollectedPlants([]);
      setDeskPlants(Array(NUM_POTS).fill(null));
    }
  }, []);

  const saveData = (collection: Plant[], desk: (Plant | null)[]) => {
    try {
        const dataToStore = {
            collection: collection,
            desk: desk,
        };
        localStorage.setItem(PLANTS_DATA_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (e) {
        console.error("Failed to save to localStorage (quota may be exceeded)", e);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your plant arrangement. Your device storage might be full.",
        });
    }
  };

  useEffect(() => {
    if (collectedPlants.length === 0 && deskPlants.every(p => p === null)) {
      const storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
      if (storedDataRaw) return;
    }
    saveData(collectedPlants, deskPlants);
  }, [collectedPlants, deskPlants]);


  const handleDraw = async () => {
    setIsDrawing(true);
    try {
        const result = await drawPlant();
        setNewPlant(result);
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
  
  const handleCollect = async (plantToCollect: DrawPlantOutput) => {
    const allCurrentPlants = [...collectedPlants, ...deskPlants.filter((p): p is Plant => p !== null)];
    const lastId = allCurrentPlants.reduce((maxId, p) => Math.max(p.id, maxId), 0);

    const newPlantItem: Plant = {
        id: lastId + 1,
        name: plantToCollect.name,
        form: 'Base',
        image: plantToCollect.imageDataUri,
        hint: plantToCollect.name.toLowerCase().split(' ').slice(0, 2).join(' '),
        description: plantToCollect.description,
    };
    
    const allPlantsToCompress = [...allCurrentPlants, newPlantItem];

    const compressedAllPlants = await Promise.all(
        allPlantsToCompress.map(async (p) => {
            try {
                const imageToCompress = p.id === newPlantItem.id ? newPlantItem.image : p.image;
                const compressedImage = await compressImage(imageToCompress);
                return { ...p, image: compressedImage };
            } catch (error) {
                console.error(`Failed to compress image for plant ${p.id}`, error);
                return { ...p, image: 'placeholder' };
            }
        })
    );
    
    // Separate compressed plants back into desk and collection
    const newDeskPlants = [...deskPlants].map(p => p ? compressedAllPlants.find(cp => cp.id === p.id) || null : null);
    const newlyAddedPlant = compressedAllPlants.find(p => p.id === newPlantItem.id);
    
    const collectionIds = new Set(collectedPlants.map(p => p.id));
    if (newlyAddedPlant) {
      collectionIds.add(newlyAddedPlant.id);
    }

    const newCollectedPlants = compressedAllPlants.filter(p => collectionIds.has(p.id) && !newDeskPlants.some(dp => dp?.id === p.id));
    
    setCollectedPlants(newCollectedPlants);
    setDeskPlants(newDeskPlants);
  };


  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
  
    if (!over || !active || active.id === over.id) {
      return;
    }
  
    const activePlant = active.data.current?.plant as Plant;
    if (!activePlant) return;
  
    const [activeSource] = (active.id as string).split(':');
    const [overType, overIdStr] = (over.id as string).split(':');
  
    let newDeskPlants = [...deskPlants];
    let newCollectedPlants = [...collectedPlants];
  
    const sourcePotIndex = activeSource === 'desk' ? newDeskPlants.findIndex(p => p?.id === activePlant.id) : -1;
  
    if (overType === 'pot') {
      const targetPotIndex = parseInt(overIdStr, 10);
      const plantAtTarget = newDeskPlants[targetPotIndex];
  
      if (activeSource === 'collection') {
        newCollectedPlants = newCollectedPlants.filter(p => p.id !== activePlant.id);
        if (plantAtTarget) {
          newCollectedPlants.push(plantAtTarget);
        }
        newDeskPlants[targetPotIndex] = activePlant;
      }
      else if (activeSource === 'desk' && sourcePotIndex !== -1) {
        newDeskPlants[targetPotIndex] = activePlant;
        newDeskPlants[sourcePotIndex] = plantAtTarget;
      }
    } 
    else if (overType === 'collection') {
      if (activeSource === 'desk' && sourcePotIndex !== -1) {
        newDeskPlants[sourcePotIndex] = null;
        if (!newCollectedPlants.find(p => p.id === activePlant.id)) {
            newCollectedPlants.push(activePlant);
        }
      }
    }
  
    setDeskPlants(newDeskPlants);
    setCollectedPlants(newCollectedPlants.sort((a,b) => a.id - b.id));
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="space-y-4">
        <header className="flex items-center justify-between p-4">
          <h1 className="font-headline text-2xl text-primary">My Room</h1>
          <Button variant="secondary" className="font-semibold" onClick={handleDraw} disabled={isDrawing}>
            {isDrawing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Drawing...
              </>
            ) : (
              <>
                <Leaf className="mr-2 h-4 w-4" />
                1 Free Draw
              </>
            )}
          </Button>
        </header>

        <section className="px-4">
          <div
            className="h-48 rounded-lg border-2 border-primary/20 bg-cover bg-center p-6"
            style={{ backgroundImage: 'url(/desk.jpg)' }}
          >
            <div className="flex h-full items-end justify-around">
              {deskPlants.map((plant, index) => (
                  <DroppablePot
                    key={plant?.id || `pot-${index}`}
                    plant={plant}
                    index={index}
                    activePlantData={activePlantData}
                    onClickPlant={setSelectedPlant}
                  />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-4">
            <h2 className="mb-4 font-headline text-xl text-primary">My Collection</h2>
            <DroppableCollectionArea>
              <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {collectedPlants.length > 0 ? (
                    collectedPlants.map((plant) => (
                        <DraggablePlant key={plant.id} plant={plant} source="collection" onClick={() => setSelectedPlant(plant)} />
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-muted-foreground py-8">
                        Your collection is empty. Go to the Home screen to draw a new plant!
                    </div>
                  )}
              </div>
          </DroppableCollectionArea>
        </section>

        <NewPlantDialog 
          plant={newPlant} 
          open={!!newPlant}
          onOpenChange={(isOpen) => {
              if (!isOpen) {
                  if (newPlant) {
                      handleCollect(newPlant);
                  }
                  setNewPlant(null);
              }
          }}
        />

        <PlantDetailDialog
          plant={selectedPlant}
          open={!!selectedPlant}
          onOpenChange={(isOpen) => {
              if (!isOpen) {
                  setSelectedPlant(null);
              }
          }}
        />

        <DragOverlay>
            {activePlantData ? (
                activePlantData.source === 'desk' ? (
                    <PlantImageUI plant={activePlantData.plant} />
                ) : (
                    <div className="w-28">
                        <PlantCardUI plant={activePlantData.plant} />
                    </div>
                )
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
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
