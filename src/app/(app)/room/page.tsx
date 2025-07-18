
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { Leaf, Loader2, Droplet, PlusCircle, Coins } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
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
import { loadDraws, useDraw } from '@/lib/draw-manager';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { updatePlantArrangement, updatePlantData, updateUserGold, savePlant } from '@/lib/firestore';

const NUM_POTS = 3;
const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 10;

// Helper to check if a timestamp is from the current day
function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
}

function WaterDropletAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <Droplet key={i} className="absolute text-blue-400 animate-water-drop" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    width: `${16 + Math.random() * 16}px`,
                    height: `${16 + Math.random() * 16}px`,
                }} />
            ))}
        </div>
    );
}

function GoldCoinAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
                <Coins key={i} className="absolute text-yellow-400 animate-float-up" style={{
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '20px',
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random() * 0.5}s`,
                    width: `${20 + Math.random() * 12}px`,
                    height: `${20 + Math.random() * 12}px`,
                }} />
            ))}
        </div>
    );
}


function PlantDetailDialog({ plant: initialPlant, open, onOpenChange, onPlantUpdate, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onPlantUpdate: (updatedPlant: Plant) => void, userId: string }) {
    const { playSfx } = useAudio();
    const { toast } = useToast();
    const [isWatering, setIsWatering] = useState(false);
    const [showGold, setShowGold] = useState(false);
    const [plant, setPlant] = useState(initialPlant);

    useEffect(() => {
        setPlant(initialPlant);
    }, [initialPlant]);

    if (!plant) return null;

    const timesWateredToday = plant.lastWatered?.filter(isToday).length ?? 0;
    const canWater = timesWateredToday < MAX_WATERINGS_PER_DAY;

    const handleWaterPlant = async () => {
        if (!canWater || !plant) return;
        
        playSfx('watering');
        setIsWatering(true);
        setShowGold(true);

        let newXp = plant.xp + XP_PER_WATERING;
        let newLevel = plant.level;

        if (newXp >= XP_PER_LEVEL) {
            newLevel += 1;
            newXp -= XP_PER_LEVEL;
            playSfx('reward');
             toast({
                title: "Level Up!",
                description: `${plant.name} has reached level ${newLevel}!`,
            });
        }
        
        const now = Date.now();
        const updatedLastWatered = [...(plant.lastWatered || []).filter(isToday), now];

        const updatedPlant: Plant = {
            ...plant,
            xp: newXp,
            level: newLevel,
            lastWatered: updatedLastWatered,
        };
        
        setPlant(updatedPlant);
        onPlantUpdate(updatedPlant);

        try {
            await updatePlantData(userId, updatedPlant);
            await updateUserGold(userId, GOLD_PER_WATERING);
        } catch(e) {
            console.error("Failed to update plant or gold", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not save watering progress."})
        }

        setTimeout(() => setIsWatering(false), 1000);
        setTimeout(() => setShowGold(false), 1000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center">{plant.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 relative">
                        <div className="rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100 flex items-center justify-center h-full">
                            {plant.image !== 'placeholder' ? (
                                <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                            ) : (
                                <Leaf className="w-24 h-24 text-muted-foreground/50" />
                            )}
                        </div>
                        {isWatering && <WaterDropletAnimation />}
                        {isWatering && <GoldCoinAnimation />}
                        {showGold && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-yellow-400/80 text-white font-bold px-3 py-1 rounded-full shadow-lg animate-fade-out-fast pointer-events-none">
                                <Coins className="w-5 h-5" />
                                <span>+10</span>
                            </div>
                        )}
                    </div>

                    <p className="text-muted-foreground text-center mt-2">{plant.description}</p>
                    
                    <div className="w-full px-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold text-primary">Level {plant.level}</p>
                             <p className="text-sm text-muted-foreground">{plant.xp} / {XP_PER_LEVEL} XP</p>
                        </div>
                        <Progress value={(plant.xp / XP_PER_LEVEL) * 100} className="w-full" />
                    </div>
                </div>
                <DialogFooter className="flex-col gap-2">
                    <Button onClick={handleWaterPlant} disabled={!canWater || isWatering} className="w-full">
                        <Droplet className="mr-2 h-4 w-4" />
                        {isWatering ? 'Watering...' : `Water Plant (${timesWateredToday}/${MAX_WATERINGS_PER_DAY})`}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PlantPot() {
    return (
        <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/30 pointer-events-none" />
    )
}

function PlantImageUI({ plant, blendMode = false }: { plant: Plant, blendMode?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-20 w-20 pointer-events-none flex items-center justify-center">
        {plant.image !== 'placeholder' ? (
            <Image src={plant.image} alt={plant.name} fill className={cn("object-contain", blendMode && "mix-blend-multiply")} data-ai-hint={plant.hint} />
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
                <div className="p-2 text-center bg-white/50 space-y-1">
                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                    <Progress value={(plant.xp / XP_PER_LEVEL) * 100} className="h-1.5" />
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
                <PlantImageUI plant={plant} blendMode={true} />
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
        "relative flex h-24 w-24 items-center justify-center rounded-lg transition-colors",
        isOver && "bg-primary/20"
      )}
    >
      {plant ? (
         <DraggablePlant plant={plant} source="desk" onClick={() => onClickPlant(plant)} />
      ) : isOver && activePlantData ? (
          <div className="flex flex-col items-center text-center opacity-60 pointer-events-none">
              <PlantImageUI plant={activePlantData.plant} blendMode={true} />
          </div>
      ) : (
          <PlantPot />
      )}
    </div>
  );
}


export default function RoomPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  
  const [collectedPlants, setCollectedPlants] = useState<Plant[]>([]);
  const [deskPlants, setDeskPlants] = useState<(Plant | null)[]>(Array(NUM_POTS).fill(null));

  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlant, setNewPlant] = useState<DrawPlantOutput | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [availableDraws, setAvailableDraws] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );
  
  useEffect(() => {
    if (gameData) {
        setCollectedPlants(gameData.collection || []);
        setDeskPlants(gameData.desk || Array(NUM_POTS).fill(null));
    }
  }, [gameData]);

  useEffect(() => {
    if (gameData?.draws) {
      setAvailableDraws(gameData.draws);
    }
  }, [gameData?.draws])

  const activePlantData = (() => {
    if (!activeId) return null;
    const [source, idStr] = activeId.split(":");
    const id = parseInt(idStr, 10);
    const plant = source === 'desk' 
        ? deskPlants.find(p => p?.id === id)
        : collectedPlants.find(p => p.id === id);
    return plant ? { plant, source } : null;
  })();

  const refreshDraws = useCallback(async () => {
    if (!user) return;
    const draws = await loadDraws(user.uid);
    setAvailableDraws(draws);
  }, [user]);

  useEffect(() => {
    refreshDraws();
  }, [refreshDraws]);

  const handlePlantUpdate = useCallback((updatedPlant: Plant) => {
    setDeskPlants(prev => prev.map(p => p?.id === updatedPlant.id ? updatedPlant : p));
    setCollectedPlants(prev => prev.map(p => p.id === updatedPlant.id ? updatedPlant : p));
    setSelectedPlant(updatedPlant);
  }, []);

  const handleDraw = async () => {
     if (!user || availableDraws <= 0) {
        toast({
            variant: "destructive",
            title: "No Draws Left",
            description: "Visit the shop to get more draws or wait for your daily refill.",
        });
        return;
    }
    setIsDrawing(true);
    try {
        const result = await drawPlant();
        // Here, we don't save the plant, just show it.
        // The save happens on the home page after collection.
        // For simplicity in room, we'll just show a "Go to Home" prompt.
        toast({
          title: "New Plant Drawn!",
          description: "Go to the Home page to see and collect your new plant.",
        });
        await useDraw(user.uid);
        refreshDraws();

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
  
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (!user) return;

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
  
    const finalCollected = newCollectedPlants.sort((a,b) => a.id - b.id);
    setDeskPlants(newDeskPlants);
    setCollectedPlants(finalCollected);
    await updatePlantArrangement(user.uid, finalCollected, newDeskPlants);
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="space-y-4">
        <header className="flex items-center justify-between p-4">
          <h1 className="text-3xl text-primary">My Room</h1>
          <Button variant="secondary" className="font-semibold" onClick={handleDraw} disabled={isDrawing || availableDraws <= 0}>
            {isDrawing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Drawing...
              </>
            ) : (
              <>
                <Leaf className="mr-2 h-4 w-4" />
                Draw Plant ({availableDraws} left)
              </>
            )}
          </Button>
        </header>

        <section className="px-4">
          <div
            className="h-48 rounded-lg border-2 border-primary/20 bg-card/80 p-6"
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
            <h2 className="mb-4 text-xl text-primary">My Collection</h2>
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

        <PlantDetailDialog
          plant={selectedPlant}
          open={!!selectedPlant}
          onOpenChange={(isOpen) => !isOpen && setSelectedPlant(null)}
          onPlantUpdate={handlePlantUpdate}
          userId={user!.uid}
        />

        <DragOverlay>
            {activePlantData ? (
                activePlantData.source === 'desk' ? (
                    <PlantImageUI plant={activePlantData.plant} blendMode={true} />
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
