
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Leaf, Loader2, Droplet, Coins, Sparkles, Droplets, Trash2, GripVertical, Star, Pipette, RefreshCw, Gem, MessageCircle } from 'lucide-react';
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
import { updateUserGold, updateUserRubies, updatePlant, getPlantById, deletePlant, useSheen, useRainbowGlitter, useGlitter, useSprinkler, useWaterRefill, useRedGlitter, unlockPlantChat, addConversationHistory, updatePlantArrangement, NUM_POTS } from '@/lib/firestore';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription as AlertDialogDescriptionComponent } from '@/components/ui/alert-dialog';
import { compressImage, makeBackgroundTransparent } from '@/lib/image-compression';
import { evolvePlantAction } from '@/app/actions/evolve-plant';
import type { DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { updateWateringProgress, updateEvolutionProgress, updateApplyGlitterProgress, updateWaterEvolvedProgress } from '@/lib/challenge-manager';
import { plantChatAction } from '@/app/actions/plant-chat';
import { Textarea } from '@/components/ui/textarea';


const MAX_WATERINGS_PER_DAY = 4;
const XP_PER_WATERING = 200;
const XP_PER_LEVEL = 1000;
const GOLD_PER_WATERING = 5;
const RUBIES_PER_WATERING = 1;
const EVOLUTION_LEVEL = 10;
const SECOND_EVOLUTION_LEVEL = 25;
const DRAG_CLICK_TOLERANCE = 5; // pixels

// Helper to check if a timestamp is from the current day
function isToday(timestamp: number): boolean {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
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

function RubyAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {Array.from({ length: 1 }).map((_, i) => (
                <Gem key={i} className="absolute text-red-500 animate-float-up" style={{
                    left: `${30 + Math.random() * 40}%`,
                    bottom: '20px',
                    animationDelay: `${Math.random() * 0.3}s`,
                    animationDuration: `${1.2 + Math.random() * 0.5}s`,
                    width: `${24 + Math.random() * 12}px`,
                    height: `${24 + Math.random() * 12}px`,
                }} />
            ))}
        </div>
    );
}


function PlantChatDialog({ plant, open, onOpenChange, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, userId: string }) {
    const [history, setHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
    const [message, setMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { playSfx } = useAudio();

    useEffect(() => {
        if (plant) {
            setHistory(plant.conversationHistory || []);
        }
    }, [plant]);

    useEffect(() => {
        // Scroll to bottom when history changes
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [history]);

    if (!plant) return null;

    const handleSendMessage = async () => {
        if (!message.trim() || isThinking) return;

        const newUserMessage = { role: 'user' as const, content: message };
        const newHistory = [...history, newUserMessage];
        setHistory(newHistory);
        setMessage('');
        setIsThinking(true);
        playSfx('tap');

        try {
            const { response } = await plantChatAction({
                plantName: plant.name,
                plantPersonality: plant.personality,
                userMessage: message,
                history: history,
                form: plant.form,
            });
            
            const newModelMessage = { role: 'model' as const, content: response };
            setHistory([...newHistory, newModelMessage]);
            await addConversationHistory(userId, plant.id, newUserMessage.content, newModelMessage.content);
            playSfx('chime');

        } catch (e) {
            console.error("Chat error:", e);
            setHistory(history); // Revert history on error
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md flex flex-col h-[70vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center text-primary">Chat with {plant.name}</DialogTitle>
                    <DialogDescription className="text-center">Personality: <span className="font-semibold">{plant.personality}</span></DialogDescription>
                </DialogHeader>
                <div ref={scrollAreaRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/50 rounded-lg">
                    {history.map((turn, index) => (
                        <div key={index} className={cn(
                            "flex items-end gap-2",
                            turn.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                           {turn.role === 'model' && (
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50 shrink-0">
                                     <Image src={plant.image} alt={plant.name} width={32} height={32} />
                                </div>
                           )}
                           <div className={cn(
                               "max-w-xs p-3 rounded-lg",
                               turn.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                           )}>
                               <p className="text-sm">{turn.content}</p>
                           </div>
                        </div>
                    ))}
                    {isThinking && (
                         <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50 shrink-0">
                                 <Image src={plant.image} alt={plant.name} width={32} height={32} />
                            </div>
                           <div className="bg-background p-3 rounded-lg">
                               <Loader2 className="w-5 h-5 animate-spin text-primary" />
                           </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="pt-4 flex-row gap-2">
                    <Textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Say something..."
                        className="flex-grow resize-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={isThinking}
                    />
                    <Button onClick={handleSendMessage} disabled={!message.trim() || isThinking}>
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PlantDetailDialog({ plant, open, onOpenChange, onStartEvolution, onOpenChat, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onStartEvolution: (plant: Plant) => void, onOpenChat: (plant: Plant) => void, userId: string }) {
    const { playSfx } = useAudio();
    const { toast } = useToast();
    const { gameData } = useAuth();
    const [isWatering, setIsWatering] = useState(false);
    const [showReward, setShowReward] = useState<'gold' | 'ruby' | null>(null);
    const [visualXp, setVisualXp] = useState(plant?.xp || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingBase, setViewingBase] = useState(false);
    const [isRefilling, setIsRefilling] = useState(false);
    const [isUnlockingChat, setIsUnlockingChat] = useState(false);

    useEffect(() => {
        if (plant) {
            setVisualXp(plant.xp);
        }
        // Reset view when dialog opens or plant changes
        setViewingBase(false);
    }, [plant, open]);

    if (!plant || !gameData) return null;

    const timesWateredToday = plant.lastWatered?.filter(isToday).length ?? 0;
    const canWater = timesWateredToday < MAX_WATERINGS_PER_DAY;
    const waterButtonText = () => {
        if (isWatering) return 'Watering...';
        return `Water Plant (${timesWateredToday}/${MAX_WATERINGS_PER_DAY})`;
    };
    
    const displayName = viewingBase ? `Base: ${plant.name}` : plant.name;
    const displayImage = viewingBase ? plant.baseImage : plant.image;

    const handleUseRefill = async () => {
        if (!plant || gameData.waterRefillCount <= 0) return;
        setIsRefilling(true);
        try {
            await useWaterRefill(userId, plant.id);
            playSfx('chime');
            toast({
                title: "Water Refilled!",
                description: `${plant.name} is ready for more water.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsRefilling(false);
        }
    };

    const handleWaterPlant = async () => {
        if (!canWater || !plant) return;
        
        setIsWatering(true);
        playSfx('watering');
        
        const isFinalForm = plant.form === 'Final';
        setShowReward(isFinalForm ? 'ruby' : 'gold');


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
            
            // This sequence ensures the bar visually resets and animates to the new value.
            setVisualXp(0);
            await new Promise(resolve => setTimeout(resolve, 50));
            setVisualXp(newXp);

            if (newLevel >= EVOLUTION_LEVEL && plant.form === 'Base') {
                shouldEvolve = true;
            } else if (newLevel >= SECOND_EVOLUTION_LEVEL && plant.form === 'Evolved') {
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
        let updatedLastWatered = [...(plant.lastWatered || []), now];

        try {
            const updatedPlantData = {
                xp: newXp,
                level: newLevel,
                lastWatered: updatedLastWatered,
            };

            await updatePlant(userId, plant.id, updatedPlantData);
            
            if (isFinalForm) {
                await updateUserRubies(userId, RUBIES_PER_WATERING);
            } else {
                await updateUserGold(userId, GOLD_PER_WATERING);
            }
            
            if (plant.form === 'Evolved' || plant.form === 'Final') {
                await updateWaterEvolvedProgress(userId);
            } else {
                await updateWateringProgress(userId);
            }

            if (shouldEvolve) {
                // Find the full, updated plant object to pass to the evolution flow
                const fullPlant = { ...plant, ...updatedPlantData };
                onStartEvolution(fullPlant);
                onOpenChange(false);
            }

        } catch(e) {
            console.error("Failed to update plant or gold", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not save watering progress."})
        }

        setTimeout(() => setIsWatering(false), 1200);
        setTimeout(() => setShowReward(null), 1000);
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
    
    const handleUnlockChat = async () => {
        if (!plant) return;
        setIsUnlockingChat(true);
        try {
            await unlockPlantChat(userId, plant.id);
            playSfx('success');
            toast({
                title: "Chat Unlocked!",
                description: `You can now chat with ${plant.name}.`
            });
        } catch (e: any) {
            console.error("Failed to unlock chat", e);
            toast({ variant: 'destructive', title: "Error", description: e.message || "Could not unlock chat." });
        } finally {
            setIsUnlockingChat(false);
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center text-primary">{displayName}</DialogTitle>
                     <div className="flex flex-row items-center justify-center pt-2 gap-2">
                         {plant.baseImage && (
                            <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setViewingBase(v => !v)}>
                                <Sparkles className="mr-1 h-3 w-3" />
                                {viewingBase ? 'View Evolved' : 'View Base Form'}
                            </Button>
                         )}
                         {plant.form === 'Final' && (
                             <>
                                {plant.chatEnabled ? (
                                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => onOpenChat(plant)}>
                                        <MessageCircle className="mr-1 h-3 w-3" />
                                        Chat
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleUnlockChat} disabled={isUnlockingChat || gameData.plantChatTokens < 1}>
                                        {isUnlockingChat ? <Loader2 className="animate-spin" /> : <><Gem className="mr-1 h-3 w-3 text-red-500" /> Unlock Chat ({gameData.plantChatTokens})</>}
                                    </Button>
                                )}
                             </>
                         )}
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescriptionComponent>
                                        This will permanently delete {plant.name} from your collection. This action cannot be undone.
                                    </AlertDialogDescriptionComponent>
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
                            {displayImage && displayImage !== 'placeholder' ? (
                                <Image src={displayImage} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                            ) : (
                                <Leaf className="w-24 h-24 text-muted-foreground/50" />
                            )}
                        </div>
                        {plant.hasGlitter && !viewingBase && <GlitterAnimation />}
                        {plant.hasRedGlitter && !viewingBase && <RedGlitterAnimation />}
                        {plant.hasSheen && !viewingBase && <SheenAnimation />}
                        {plant.hasRainbowGlitter && !viewingBase && <RainbowGlitterAnimation />}
                        {isWatering && <WaterDropletAnimation />}
                        {showReward === 'gold' && <GoldCoinAnimation />}
                        {showReward === 'ruby' && <RubyAnimation />}
                        {showReward && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-yellow-400/80 text-white font-bold px-3 py-1 rounded-full shadow-lg animate-fade-out-fast pointer-events-none">
                                {showReward === 'gold' ? <Coins className="w-5 h-5" /> : <Gem className="w-5 h-5 text-red-300" />}
                                <span>+1</span>
                            </div>
                        )}
                    </div>

                    <p className="text-muted-foreground text-center mt-2 px-4">{plant.description}</p>
                    
                    <div className="w-full px-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold text-primary">Level {plant.level}</p>
                             <p className="text-sm text-muted-foreground">{visualXp} / {XP_PER_LEVEL} XP</p>
                        </div>
                        <Progress value={(visualXp / XP_PER_LEVEL) * 100} className="w-full" />
                    </div>

                </div>
                <DialogFooter className="pt-2 flex-col sm:flex-col sm:space-x-0 gap-2">
                    <Button onClick={handleWaterPlant} disabled={!canWater || isWatering || viewingBase} className="w-full bg-blue-500 hover:bg-blue-600">
                        <Droplet className="mr-2 h-4 w-4" />
                        {waterButtonText()}
                    </Button>
                    {!canWater && gameData.waterRefillCount > 0 && (
                        <Button
                            onClick={handleUseRefill}
                            disabled={isRefilling || viewingBase}
                            className="w-full"
                            variant="secondary"
                        >
                           {isRefilling ? <Loader2 className="animate-spin" /> : <><RefreshCw className="mr-2 h-4 w-4" /> Use Refill ({gameData.waterRefillCount})</>}
                        </Button>
                    )}
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

function PlantImageUI({ plant, image, canWater }: { plant: Plant, image: string | null, canWater: boolean }) {
  return (
    <div className={cn("flex items-center justify-center p-1 rounded-lg pointer-events-none w-full h-full", canWater && "animate-glow")}>
      <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center">
        {image && image !== 'placeholder' ? (
            <Image 
                src={image} 
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
  );
}

function DeskPot({ plant, index, onClickPlant, processedImage, canWater }: { plant: Plant | null, index: number, onClickPlant: (plant: Plant) => void, processedImage: string | null, canWater: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id: `pot:${index}` });
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
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            <DraggablePlant 
                plant={{...plant, image: processedImage || plant.image}}
                source="desk" 
                canWater={canWater}
                className="cursor-grab active:cursor-grabbing w-full h-full z-10" 
            />
            <div ref={setNodeRef} className={cn("absolute inset-0 z-0", isOver && "bg-black/20 rounded-lg")} />
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

function DraggablePlant({ plant, source, canWater, ...rest }: { plant: Plant; source: 'desk' | 'collection'; canWater?: boolean;} & React.HTMLAttributes<HTMLDivElement>) {
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
            <PlantImageUI plant={plant} image={plant.image} canWater={canWater || false} />
        </div>
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


function EvolveConfirmationDialog({ plant, open, onConfirm, onCancel, isEvolving }: { plant: Plant | null, open: boolean, onConfirm: () => void, onCancel: () => void, isEvolving: boolean }) {
    if (!plant) return null;

    return (
        <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Your plant is growing!</AlertDialogTitle>
                    <AlertDialogDescriptionComponent>
                        {plant.name} is ready for a new form! Would you like to evolve it?
                    </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} disabled={isEvolving}>Later</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isEvolving}>
                        {isEvolving ? <Loader2 className="animate-spin" /> : 'Evolve'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function EvolvePreviewDialog({ plantName, newForm, newImageUri, open, onConfirm }: { plantName: string, newForm: string, newImageUri: string, open: boolean, onConfirm: () => void }) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onConfirm()}>
            <DialogContent className="max-w-sm">
                 <DialogHeader>
                    <DialogTitle className="text-3xl text-center">Evolution Complete!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={newImageUri} alt={`Evolved ${plantName}`} width={256} height={256} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-2xl font-semibold text-primary">{plantName} has evolved into its {newForm} form!</h3>
                </div>
                <DialogFooter>
                    <Button onClick={onConfirm} className="w-full text-lg">Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
  const { playSfx } = useAudio();
  
  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);
  const [deskPlantIds, setDeskPlantIds] = useState<(number | null)[]>([]);
  const [isWatering, setIsWatering] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [currentEvolvingPlant, setCurrentEvolvingPlant] = useState<Plant | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolvedPreviewData, setEvolvedPreviewData] = useState<{plantId: number; plantName: string; newForm: string, newImageUri: string, personality?: string } | null>(null);

  const [processedDeskImages, setProcessedDeskImages] = useState<Record<number, string | null>>({});

  // For Plant Chat
  const [chattingPlant, setChattingPlant] = useState<Plant | null>(null);

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
        setDeskPlantIds(gameData.deskPlantIds || Array(NUM_POTS).fill(null));
    }
  }, [gameData]);

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);
  const collectionPlants = useMemo(() => collectionPlantIds.map(id => allPlants[id]).filter(Boolean).sort((a,b) => b.level - a.level), [collectionPlantIds, allPlants]);
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


    const handleUseSprinkler = async () => {
        if (!user || !gameData) return;
        setIsWatering(true);
        try {
            const result = await useSprinkler(user.uid);
            if (result.plantsWatered > 0) {
                playSfx('reward');
                toast({
                    title: "Plants Watered!",
                    description: `Watered ${result.plantsWatered} plant(s) and gained ${result.goldGained} gold.`,
                });
                if (result.newlyEvolvablePlants.length > 0) {
                   for (const plantId of result.newlyEvolvablePlants) {
                     const plant = await getPlantById(user.uid, plantId);
                     if (plant) {
                       setCurrentEvolvingPlant(plant);
                       break;
                     }
                   }
                }
            } else {
                 toast({
                    title: "All Set!",
                    description: "All your plants are already watered for the day.",
                });
            }
        } catch (e: any) {
            console.error("Failed to use sprinkler", e);
            toast({ variant: 'destructive', title: "Error", description: e.message || "Could not use sprinkler." });
        } finally {
            setIsWatering(false);
        }
    };
  
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
    if (!user || !evolvedPreviewData) return;
    
    try {
        playSfx('success');
        const plantToUpdateId = evolvedPreviewData.plantId;
        const { newImageUri, newForm, personality } = evolvedPreviewData;
        const compressedImage = await compressImage(newImageUri);
        const currentPlant = allPlants[plantToUpdateId];

        const updateData: Partial<Plant> = {
            image: compressedImage,
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
      <div className="space-y-4 bg-white min-h-screen">
        <header className="flex flex-col items-center gap-2 p-4 text-center">
          <h1 className="text-3xl text-primary text-center">My Room</h1>
          <p className="text-muted-foreground text-sm">Drag plants from your collection to your desk to display and water them.</p>
        </header>

        <section 
            className="relative h-64 max-w-lg mx-auto rounded-lg bg-cover bg-center" 
            style={{backgroundImage: "url('/desk-bg.png')"}}
        >
            <div className="absolute -top-12 right-0 left-0 mx-auto w-fit">
                 <div className="flex justify-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                    {gameData.sprinklerUnlocked && (
                        <Button onClick={handleUseSprinkler} disabled={isWatering} size="sm">
                            <Droplets className="mr-2 h-4 w-4" />
                            {isWatering ? 'Watering...' : `Use Sprinkler`}
                        </Button>
                    )}
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-40 p-4 sm:p-6 md:p-8 grid grid-cols-5 grid-rows-1 gap-2">
                {deskPlants.slice(0, 5).map((plant, index) => {
                    const canWater = plant ? (plant.lastWatered?.filter(isToday).length ?? 0) < MAX_WATERINGS_PER_DAY : false;
                    return (
                        <DeskPot
                            key={plant?.id || `pot-${index}`}
                            plant={plant}
                            index={index}
                            onClickPlant={(p) => setSelectedPlant(allPlants[p.id])}
                            processedImage={plant ? processedDeskImages[plant.id] : null}
                            canWater={canWater}
                        />
                    )
                })}
            </div>
        </section>

        <section className="px-4 pb-24">
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
                    <div className="w-28 h-28">
                       <PlantImageUI plant={activeDragData.plant} image={activeDragData.image} canWater={false} />
                    </div>
                )
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
