
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { Leaf, Loader2, Droplet, PlusCircle, Coins, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useDraw } from '@/lib/draw-manager';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { updatePlantArrangement, updateUserGold, savePlant, useWaterRefill, updatePlant, getPlantById } from '@/lib/firestore';
import { evolvePlant } from '@/ai/flows/evolve-plant-flow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const NUM_POTS = 3;
const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 10;
const EVOLUTION_LEVEL = 10;

// Helper function to compress an image
async function compressImage(dataUri: string, maxSize = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous'; // Fix for tainted canvas error
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
            // Use JPEG with a quality setting for better compression
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

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


function PlantDetailDialog({ plant, open, onOpenChange, onEvolutionStart, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onEvolutionStart: (plantId: number) => void, userId: string }) {
    const { playSfx } = useAudio();
    const { toast } = useToast();
    const { gameData } = useAuth();
    const [isWatering, setIsWatering] = useState(false);
    const [showGold, setShowGold] = useState(false);
    
    if (!plant || !gameData) return null;

    const timesWateredToday = plant.lastWatered?.filter(isToday).length ?? 0;
    const hasWaterRefills = gameData.waterRefills > 0;
    const canWater = hasWaterRefills || (timesWateredToday < MAX_WATERINGS_PER_DAY);
    const waterButtonText = () => {
        if (isWatering) return 'Watering...';
        if (hasWaterRefills) return `Use Refill (${gameData.waterRefills} left)`;
        return `Water Plant (${timesWateredToday}/${MAX_WATERINGS_PER_DAY})`;
    };

    const handleWaterPlant = async () => {
        if (!canWater || !plant) return;
        
        playSfx('watering');
        setTimeout(() => playSfx('watering'), 200);
        setIsWatering(true);
        setShowGold(true);

        let newXp = plant.xp + XP_PER_WATERING;
        let newLevel = plant.level;
        let shouldEvolve = false;

        if (newXp >= XP_PER_LEVEL) {
            newLevel += 1;
            newXp -= XP_PER_LEVEL;

            if (newLevel >= EVOLUTION_LEVEL && plant.form === 'Base') {
                shouldEvolve = true;
            } else {
                playSfx('reward');
                toast({
                    title: "Level Up!",
                    description: `${plant.name} has reached level ${newLevel}!`,
                });
            }
        }
        
        const now = Date.now();
        let updatedLastWatered = plant.lastWatered || [];

        try {
            const usedRefill = hasWaterRefills && timesWateredToday >= MAX_WATERINGS_PER_DAY;
            
            if (usedRefill) {
                 await useWaterRefill(userId);
                 toast({
                    title: "Water Refill Used",
                    description: `You have ${gameData.waterRefills - 1} refills remaining.`,
                });
            } else {
                 updatedLastWatered = [...updatedLastWatered.filter(isToday), now];
            }

            const updatedPlantData: Partial<Plant> = {
                xp: newXp,
                level: newLevel,
                lastWatered: updatedLastWatered,
            };
            
            await updatePlant(userId, plant.id, {
                xp: newXp,
                level: newLevel,
                lastWatered: updatedLastWatered,
            });
            await updateUserGold(userId, GOLD_PER_WATERING);

            if (shouldEvolve) {
                onEvolutionStart(plant.id);
                onOpenChange(false); // Close details to show evolution dialog
            }

        } catch(e) {
            console.error("Failed to update plant or gold", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not save watering progress."})
        }

        setTimeout(() => setIsWatering(false), 2000);
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
                    <Button onClick={handleWaterPlant} disabled={!canWater || isWatering || plant.form !== 'Base'} className="w-full">
                        {plant.form !== 'Base' ? (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Evolved!
                            </>
                        ) : (
                            <>
                                <Droplet className="mr-2 h-4 w-4" />
                                {waterButtonText()}
                            </>
                        )}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NewPlantDialog({ plant, open, onOpenChange }: { plant: DrawPlantOutput | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!plant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center">A new plant!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={plant.imageDataUri} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-2xl font-semibold text-primary">{plant.name}</h3>
                    <p className="text-muted-foreground text-center">{plant.description}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="w-full text-lg">Collect</Button>
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
  const { playSfx } = useAudio();
  
  const [deskPlantIds, setDeskPlantIds] = useState<(number | null)[]>(Array(NUM_POTS).fill(null));
  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [plantIdToEvolve, setPlantIdToEvolve] = useState<number | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );
  
  useEffect(() => {
    if (gameData) {
        setDeskPlantIds(gameData.deskPlantIds || Array(NUM_POTS).fill(null));
        setCollectionPlantIds(gameData.collectionPlantIds || []);
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);
  const deskPlants = useMemo(() => deskPlantIds.map(id => id ? allPlants[id] : null), [deskPlantIds, allPlants]);
  const collectedPlants = useMemo(() => collectionPlantIds.map(id => allPlants[id]).filter(Boolean), [collectionPlantIds, allPlants]);
  
  const evolutionPlantName = useMemo(() => {
    if (!plantIdToEvolve) return '';
    return allPlants[plantIdToEvolve]?.name || '';
  }, [plantIdToEvolve, allPlants]);


  const activePlantData = (() => {
    if (!activeId) return null;
    const [source, idStr] = activeId.split(":");
    const id = parseInt(idStr, 10);
    const plant = allPlants[id];
    return plant ? { plant, source } : null;
  })();

  const handleDraw = async () => {
    if (!user || !gameData || gameData.draws <= 0) {
        toast({
            variant: "destructive",
            title: "No Draws Left",
            description: "Visit the shop to get more draws or wait for your daily refill.",
        });
        return;
    }
    
    setIsDrawing(true);
    try {
        await useDraw(user.uid);

        const drawnPlantResult = await drawPlant();
        const compressedImageDataUri = await compressImage(drawnPlantResult.imageDataUri);
        
        playSfx('success');
        setDrawnPlant({
            ...drawnPlantResult,
            imageDataUri: compressedImageDataUri,
        });

    } catch (e: any) {
        console.error(e);
        if (e.message === 'Invalid API Key') {
            toast({
                variant: "destructive",
                title: "Invalid API Key",
                description: "Please check your GOOGLE_API_KEY in the .env file.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Failed to draw a plant",
                description: "There was an issue with the AI. Please try again.",
            });
        }
    } finally {
        setIsDrawing(false);
    }
  };

  const handleCollect = async () => {
    if (!drawnPlant || !user) return;

    try {
        const plainDrawnPlant = JSON.parse(JSON.stringify(drawnPlant));
        await savePlant(user.uid, plainDrawnPlant);
    } catch (e) {
        console.error("Failed to save plant to Firestore", e);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your new plant.",
        });
    }
    
    setDrawnPlant(null);
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
  
    let newDeskPlantIds = [...deskPlantIds];
    let newCollectionPlantIds = [...collectionPlantIds];
  
    const sourcePotIndex = activeSource === 'desk' ? newDeskPlantIds.findIndex(id => id === activePlant.id) : -1;
  
    if (overType === 'pot') {
      const targetPotIndex = parseInt(overIdStr, 10);
      const plantIdAtTarget = newDeskPlantIds[targetPotIndex];
  
      if (activeSource === 'collection') {
        newCollectionPlantIds = newCollectionPlantIds.filter(id => id !== activePlant.id);
        if (plantIdAtTarget) {
          newCollectionPlantIds.push(plantIdAtTarget);
        }
        newDeskPlantIds[targetPotIndex] = activePlant.id;
      }
      else if (activeSource === 'desk' && sourcePotIndex !== -1) {
        newDeskPlantIds[targetPotIndex] = activePlant.id;
        newDeskPlantIds[sourcePotIndex] = plantIdAtTarget;
      }
    } 
    else if (overType === 'collection') {
      if (activeSource === 'desk' && sourcePotIndex !== -1) {
        newDeskPlantIds[sourcePotIndex] = null;
        if (!newCollectionPlantIds.includes(activePlant.id)) {
            newCollectionPlantIds.push(activePlant.id);
        }
      }
    }
  
    const finalCollectionIds = newCollectionPlantIds.sort((a,b) => a - b);
    setDeskPlantIds(newDeskPlantIds);
    setCollectionPlantIds(finalCollectionIds);
    await updatePlantArrangement(user.uid, finalCollectionIds, newDeskPlantIds);
  };
  
  const handleEvolutionStart = (plantId: number) => {
    const plant = allPlants[plantId];
    if (plant) {
        setPlantIdToEvolve(plantId);
    }
  };

  const handleEvolve = async () => {
    if (!plantIdToEvolve || !user) return;

    setIsEvolving(true);
    try {
        const plantToEvolve = await getPlantById(user.uid, plantIdToEvolve);
        if (!plantToEvolve) {
            throw new Error("Plant not found for evolution.");
        }

        const { newImageDataUri } = await evolvePlant({
            name: plantToEvolve.name,
            imageDataUri: plantToEvolve.image,
        });

        const compressedImageDataUri = await compressImage(newImageDataUri);
        
        await updatePlant(user.uid, plantIdToEvolve, { image: compressedImageDataUri, form: 'Evolved' });
        
        playSfx('success');
        toast({
            title: "Evolution Complete!",
            description: `${plantToEvolve.name} has evolved!`,
        });

    } catch (e) {
        console.error("Evolution failed", e);
        toast({ variant: 'destructive', title: "Evolution Failed", description: "Could not evolve your plant. Please try again." });
    } finally {
        setIsEvolving(false);
        setPlantIdToEvolve(null);
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
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="space-y-4 bg-white min-h-screen">
        <header className="flex items-center justify-between p-4">
          <h1 className="text-3xl text-primary">My Room</h1>
          <Button variant="secondary" className="font-semibold" onClick={handleDraw} disabled={isDrawing || gameData.draws <= 0}>
            {isDrawing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Drawing...
              </>
            ) : (
              <>
                <Leaf className="mr-2 h-4 w-4" />
                Draw Plant ({gameData.draws} left)
              </>
            )}
          </Button>
        </header>

        <section className="px-4">
          <div
            className="relative h-48 rounded-lg border-2 border-primary/20 bg-card/80 p-6 overflow-hidden"
          >
            <Image
              src="/desk.jpg"
              alt="A wooden desk for plants"
              layout="fill"
              objectFit="cover"
              className="z-0"
              data-ai-hint="desk wood"
            />
            <div className="relative z-10 flex h-full items-end justify-around">
              {deskPlants.map((plant, index) => (
                  <DroppablePot
                    key={plant?.id || `pot-${index}`}
                    plant={plant}
                    index={index}
                    activePlantData={activePlantData}
                    onClickPlant={(p) => setSelectedPlant(allPlants[p.id])}
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
                        <DraggablePlant key={plant.id} plant={plant} source="collection" onClick={() => setSelectedPlant(allPlants[plant.id])} />
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
          plant={selectedPlant ? allPlants[selectedPlant.id] : null}
          open={!!selectedPlant}
          onOpenChange={(isOpen) => !isOpen && setSelectedPlant(null)}
          onEvolutionStart={handleEvolutionStart}
          userId={user.uid}
        />

        <NewPlantDialog
          plant={drawnPlant}
          open={!!drawnPlant}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleCollect();
            }
          }}
        />

        <AlertDialog open={!!plantIdToEvolve || isEvolving} onOpenChange={(isOpen) => !isOpen && setPlantIdToEvolve(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isEvolving ? "Evolving..." : "Your plant is growing!"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isEvolving ? "Please wait a moment." : `${evolutionPlantName} is ready for a new form! Would you like to evolve it?`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {isEvolving && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isEvolving}>Later</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEvolve} disabled={isEvolving}>
                        {isEvolving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evolving...</> : "Evolve"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
