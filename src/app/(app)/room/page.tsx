
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Leaf, Loader2, Droplet, Coins, Sparkles, Droplets, Trash2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
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
import { updatePlantArrangement, updateUserGold, savePlant, useWaterRefill, updatePlant, getPlantById, deletePlant, useGlitter } from '@/lib/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { compressImage, makeBackgroundTransparent } from '@/lib/image-compression';
import { Badge } from '@/components/ui/badge';
import { evolvePlantAction } from '@/app/actions/evolve-plant';
import { drawPlantAction } from '@/app/actions/draw-plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { updateWateringProgress, updateEvolutionProgress, updateCollectionProgress } from '@/lib/challenge-manager';

const NUM_POTS = 3;
const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 5;
const EVOLUTION_LEVEL = 10;

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
                    width: `${8 + Math.random() * 8}px`,
                    height: `${8 + Math.random() * 8}px`,
                }} />
            ))}
        </div>
    );
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
    const [visualXp, setVisualXp] = useState(plant?.xp || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    
    useEffect(() => {
        if (plant) {
            setVisualXp(plant.xp);
        }
    }, [plant]);

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

        const xpGained = XP_PER_WATERING;
        let newXp = plant.xp + xpGained;
        let newLevel = plant.level;
        let shouldEvolve = false;

        const willLevelUp = newXp >= XP_PER_LEVEL;

        if (willLevelUp) {
            setVisualXp(XP_PER_LEVEL); // Fill the bar to full visually
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animation

            newLevel += 1;
            newXp -= XP_PER_LEVEL;
            setVisualXp(newXp);

            if (newLevel >= EVOLUTION_LEVEL && plant.form === 'Base') {
                shouldEvolve = true;
            } else {
                playSfx('reward');
                toast({
                    title: "Level Up!",
                    description: `${plant.name} has reached level ${newLevel}!`,
                });
            }
        } else {
            setVisualXp(newXp);
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

            await updatePlant(userId, plant.id, {
                xp: newXp,
                level: newLevel,
                lastWatered: updatedLastWatered,
            });
            await updateUserGold(userId, GOLD_PER_WATERING);
            await updateWateringProgress(userId);

            if (shouldEvolve) {
                onEvolutionStart(plant.id);
                onOpenChange(false);
            }

        } catch(e) {
            console.error("Failed to update plant or gold", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not save watering progress."})
        }

        setTimeout(() => setIsWatering(false), 1200);
        setTimeout(() => setShowGold(false), 1000);
    };

    const handleDeletePlant = async () => {
        if (!plant) return;
        setIsDeleting(true);
        try {
            await deletePlant(userId, plant.id);
            toast({
                title: "Plant Deleted",
                description: `${plant.name} has been removed from your collection.`,
            });
            onOpenChange(false);
        } catch (e) {
            console.error("Failed to delete plant", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the plant." });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center text-primary">{plant.name}</DialogTitle>
                     <div className="flex justify-center pt-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-7 px-2">
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Delete Plant
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete {plant.name} from your collection. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeletePlant} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                        {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, delete it"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 pt-4">
                    <div className="w-64 h-64 relative">
                        <div className="rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100 flex items-center justify-center h-full">
                            {plant.image !== 'placeholder' ? (
                                <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                            ) : (
                                <Leaf className="w-24 h-24 text-muted-foreground/50" />
                            )}
                        </div>
                        {plant.hasGlitter && <GlitterAnimation />}
                        {isWatering && <WaterDropletAnimation />}
                        {isWatering && <GoldCoinAnimation />}
                        {showGold && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-yellow-400/80 text-white font-bold px-3 py-1 rounded-full shadow-lg animate-fade-out-fast pointer-events-none">
                                <Coins className="w-5 h-5" />
                                <span>+{GOLD_PER_WATERING}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-muted-foreground text-center mt-2 px-4">{plant.description}</p>
                    
                    <div className="w-full px-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold text-primary">Level {plant.level}</p>
                             <p className="text-sm text-muted-foreground">{isWatering ? visualXp : plant.xp} / {XP_PER_LEVEL} XP</p>
                        </div>
                        <Progress value={((isWatering ? visualXp : plant.xp) / XP_PER_LEVEL) * 100} className="w-full" />
                    </div>

                </div>
                <DialogFooter className="pt-2">
                    <Button onClick={handleWaterPlant} disabled={!canWater || isWatering} className="w-full">
                        <Droplet className="mr-2 h-4 w-4" />
                        {waterButtonText()}
                    </Button>
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
                    <DialogTitle className="text-3xl text-center text-primary">A new plant!</DialogTitle>
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

function PlantImageUI({ plant, image }: { plant: Plant, image: string | null }) {
  return (
    <div className="flex flex-col items-center text-center pointer-events-none w-full h-full">
      <div className="relative h-20 w-20 flex items-center justify-center">
        {image && image !== 'placeholder' ? (
            <Image 
                src={image} 
                alt={plant.name} 
                fill 
                sizes="80px" 
                className="object-contain"
                data-ai-hint={plant.hint} />
        ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg bg-muted/20">
              <Leaf className="w-12 h-12 text-muted-foreground/50" />
            </div>
        )}
        {plant.hasGlitter && <GlitterAnimation />}
      </div>
      <p className="mt-1 text-xs font-semibold text-primary truncate w-full">{plant.name}</p>
    </div>
  );
}

function PlantCardUI({ plant, onApplyGlitter, canApplyGlitter }: { plant: Plant, onApplyGlitter: (plantId: number) => void; canApplyGlitter: boolean; }) {
    return (
        <Card className="group overflow-hidden shadow-md w-full relative">
            {canApplyGlitter && !plant.hasGlitter && (
                <Button
                    size="icon"
                    className="absolute top-1 left-1 z-10 h-7 w-7 bg-yellow-400/80 text-white hover:bg-yellow-500/90"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the detail dialog
                        onApplyGlitter(plant.id);
                    }}
                >
                    <Sparkles className="h-4 w-4" />
                </Button>
            )}
            <CardContent className="p-0">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                    {plant.image !== 'placeholder' ? (
                        <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                    {plant.hasGlitter && <GlitterAnimation />}
                    {plant.form === 'Evolved' && (
                        <Badge variant="secondary" className="absolute top-2 right-2 shadow-md">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Evolved
                        </Badge>
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

function DraggablePlant({ plant, source, className, image, onApplyGlitter, canApplyGlitter, ...rest }: { plant: Plant; source: 'collection' | 'desk', className?: string, image?: string | null, onApplyGlitter?: (plantId: number) => void; canApplyGlitter?: boolean; } & React.HTMLAttributes<HTMLDivElement>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${source}:${plant.id}`,
        data: { plant, source },
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={className} {...rest}>
            {source === 'collection' && onApplyGlitter && typeof canApplyGlitter !== 'undefined' ? (
                <PlantCardUI 
                    plant={plant} 
                    onApplyGlitter={onApplyGlitter} 
                    canApplyGlitter={canApplyGlitter}
                />
            ) : (
                <PlantImageUI plant={plant} image={image}/>
            )}
        </div>
    );
}

function DeskPot({ plant, index, onClickPlant, processedImage }: { plant: Plant | null, index: number, onClickPlant: (plant: Plant) => void, processedImage: string | null }) {
    const { setNodeRef, isOver } = useDroppable({ id: `pot:${index}` });
    const isDragging = useDraggable({ id: `desk:${plant?.id}`, data: { plant, source: 'desk' } }).isDragging;

    const handleClick = (e: React.MouseEvent) => {
        if (!isDragging && plant) {
             onClickPlant(plant);
        }
    };
    
    const EmptyPot = () => (
        <div ref={setNodeRef} className={cn(
            "relative flex h-24 w-24 items-end justify-center rounded-lg transition-colors",
            isOver ? "bg-primary/20" : "bg-transparent"
        )}>
            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/30" />
        </div>
    );

    if (!plant) {
        return <EmptyPot />;
    }
    
    return (
        <div
            onClick={handleClick}
            className="relative flex h-24 w-24 items-end justify-center rounded-lg cursor-grab active:cursor-grabbing"
        >
            <div ref={setNodeRef} className={cn("absolute inset-0 z-0", isOver && "bg-primary/20 rounded-lg")} />
            <DraggablePlant 
                plant={plant} 
                source="desk"
                className="w-full h-full z-10"
                image={processedImage}
            />
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [plantIdToEvolve, setPlantIdToEvolve] = useState<number | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);

  const [processedDeskImages, setProcessedDeskImages] = useState<Record<number, string | null>>({});

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
        setDeskPlantIds(gameData.deskPlantIds || Array(NUM_POTS).fill(null));
        setCollectionPlantIds(gameData.collectionPlantIds || []);
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);
  const deskPlants = useMemo(() => deskPlantIds.map(id => id ? allPlants[id] : null), [deskPlantIds, allPlants]);
  const collectionPlants = useMemo(() => collectionPlantIds.map(id => allPlants[id]).filter(Boolean), [collectionPlantIds, allPlants]);
  
  const evolutionPlantName = useMemo(() => {
    if (!plantIdToEvolve) return '';
    return allPlants[plantIdToEvolve]?.name || '';
  }, [plantIdToEvolve, allPlants]);

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
    if (!activeDragId) return null;
    const [source, idStr] = activeDragId.split(":");
    const id = parseInt(idStr, 10);
    const plant = allPlants[id];
    let image = plant?.image;
    if(source === 'desk' && plant && processedDeskImages[plant.id]) {
        image = processedDeskImages[plant.id] ?? plant.image;
    }
    return plant ? { plant, source, image } : null;
  }, [activeDragId, allPlants, processedDeskImages]);

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

        const existingNames = gameData.plants ? Object.values(gameData.plants).map(p => p.name) : [];
        const drawnPlantResult = await drawPlantAction(existingNames);
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
        await updateCollectionProgress(user.uid);
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
    setActiveDragId(null);
    if (!user) return;

    const { active, over } = event;
  
    if (!over || !active.data.current?.plant) {
      return;
    }
  
    const activePlant = active.data.current.plant as Plant;
    const [activeSource] = (active.id as string).split(':');
    
    const [overType, overIdStr] = (over.id as string).split(':');
    
    let newDeskIds = [...deskPlantIds];
    let newCollectionIds = [...collectionPlantIds];

    // Dragging from collection
    if (activeSource === 'collection') {
      if (overType === 'pot') {
        const potIndex = parseInt(overIdStr, 10);
        const plantInPotId = newDeskIds[potIndex];

        // Add dragged plant to pot
        newDeskIds[potIndex] = activePlant.id;
        // Remove from collection
        newCollectionIds = newCollectionIds.filter(id => id !== activePlant.id);
        // If a plant was in the pot, move it to collection
        if (plantInPotId) {
          newCollectionIds.push(plantInPotId);
        }
      }
    }
    // Dragging from desk
    else if (activeSource === 'desk') {
      const sourcePotIndex = newDeskIds.findIndex(id => id === activePlant.id);

      if (sourcePotIndex === -1) return;

      if (overType === 'pot') { // desk to desk
        const targetPotIndex = parseInt(overIdStr, 10);
        const plantInTargetPotId = newDeskIds[targetPotIndex];
        
        // Swap plants
        newDeskIds[targetPotIndex] = activePlant.id;
        newDeskIds[sourcePotIndex] = plantInTargetPotId;

      } else if (overType === 'collection') { // desk to collection
        newDeskIds[sourcePotIndex] = null;
        if (!newCollectionIds.includes(activePlant.id)) {
            newCollectionIds.push(activePlant.id);
        }
      }
    }
  
    const finalCollectionIds = newCollectionIds.sort((a,b) => a - b);
    setDeskPlantIds(newDeskIds);
    setCollectionPlantIds(finalCollectionIds);
    await updatePlantArrangement(user.uid, finalCollectionIds, newDeskIds);
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

        const { newImageDataUri } = await evolvePlantAction({
            name: plantToEvolve.name,
            imageDataUri: plantToEvolve.image,
        });

        const compressedImageDataUri = await compressImage(newImageDataUri);
        
        await updatePlant(user.uid, plantIdToEvolve, { image: compressedImageDataUri, form: 'Evolved' });
        await updateEvolutionProgress(user.uid);
        
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
  
  const handleApplyGlitter = async (plantId: number) => {
    if (!user) return;
    try {
        await useGlitter(user.uid);
        await updatePlant(user.uid, plantId, { hasGlitter: true });
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
  
  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
      <div className="space-y-4 bg-white min-h-screen">
        <header className="flex flex-col items-center gap-4 p-4 text-center">
          <h1 className="text-3xl text-primary text-center">My Room</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-yellow-100/80 px-3 py-1 border border-yellow-300/80">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-yellow-700">{gameData.glitterCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100/80 px-3 py-1 border border-blue-300/80">
              <Droplets className="h-5 w-5 text-blue-500" />
              <span className="font-bold text-blue-700">{gameData.waterRefills}</span>
            </div>
          </div>
        </header>

        <section className="px-4">
          <div
            className="relative h-48 rounded-lg border-2 border-primary/20 bg-card/80 p-6 overflow-hidden"
          >
            <Image
              src="/desk.jpg"
              alt="A wooden desk for plants"
              fill
              className="z-0 object-cover"
              data-ai-hint="desk wood"
              sizes="100vw"
              priority
            />
            <div className="relative z-10 flex h-full items-end justify-around">
              {deskPlants.map((plant, index) => (
                  <DeskPot
                    key={plant?.id || `pot-${index}`}
                    plant={plant}
                    index={index}
                    onClickPlant={(p) => setSelectedPlant(allPlants[p.id])}
                    processedImage={plant ? processedDeskImages[plant.id] : null}
                  />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 flex justify-center">
            <Button className="font-semibold w-full max-w-xs" onClick={handleDraw} disabled={isDrawing || gameData.draws <= 0}>
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
        </section>

        <section className="px-4 pb-4">
            <h2 className="mb-4 text-xl text-primary text-center">My Collection</h2>
            <DroppableCollectionArea>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                  {collectionPlants.length > 0 ? (
                    collectionPlants.map((plant) => (
                         <DraggablePlant 
                            key={plant.id} 
                            plant={plant} 
                            source="collection"
                            onClick={() => setSelectedPlant(allPlants[plant.id])} 
                            onApplyGlitter={handleApplyGlitter}
                            canApplyGlitter={gameData.glitterCount > 0}
                            className="cursor-grab active:cursor-grabbing"
                        />
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
                    <AlertDialogTitle className="text-center text-primary">
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
            {activeDragData ? (
                <div className="w-28">
                    {activeDragData.source === 'desk' ? (
                        <PlantImageUI plant={activeDragData.plant} image={activeDragData.image}/>
                    ) : (
                        <PlantCardUI plant={activeDragData.plant} onApplyGlitter={() => {}} canApplyGlitter={false} />
                    )}
                </div>
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

    