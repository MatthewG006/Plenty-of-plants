
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
import { savePlant, deletePlant, updateShowcasePlants, GameData, updatePlantArrangement } from '@/lib/firestore';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription as AlertDialogDescriptionComponent } from '@/components/ui/alert-dialog';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import { Badge } from '@/components/ui/badge';
import { plantChatAction } from '@/app/actions/plant-chat';
import { Textarea } from '@/components/ui/textarea';

const NUM_POTS = 5;
const XP_PER_LEVEL = 1000;
const DRAG_CLICK_TOLERANCE = 5; // pixels
const MAX_SHOWCASE_PLANTS = 5;
const LONG_PRESS_DURATION = 500; // ms

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
            // This needs to be updated to a firestore call
            // await addConversationHistory(userId, plant.id, newUserMessage.content, newModelMessage.content);
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

function PlantCardUI({ plant, onClick }: { plant: Plant, onClick: () => void }) {
    return (
        <Card className="group overflow-hidden shadow-md w-full relative cursor-pointer" onClick={onClick}>
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
                        <Badge variant="secondary" className="absolute top-2 right-2 shadow-md">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Evolved
                        </Badge>
                    )}
                    {plant.form === 'Final' && (
                        <Badge variant="destructive" className="absolute top-2 right-2 shadow-md">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Max
                        </Badge>
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

function PlantActionDialog({
  plant,
  open,
  onOpenChange,
  onDelete,
  onToggleShowcase,
  onOpenChat,
  isPlantInShowcase,
  canAddToShowcase,
}: {
  plant: Plant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (plantId: number) => void;
  onToggleShowcase: (plantId: number) => void;
  onOpenChat: (plant: Plant) => void;
  isPlantInShowcase: boolean;
  canAddToShowcase: boolean;
}) {
  if (!plant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">{plant.name}</DialogTitle>
          <DialogDescription className="text-center">Select an action for your plant.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={() => {
              onToggleShowcase(plant.id);
              onOpenChange(false);
            }}
            disabled={!isPlantInShowcase && !canAddToShowcase}
          >
            <Star className="mr-2 h-4 w-4" />
            {isPlantInShowcase ? 'Remove from Showcase' : 'Add to Showcase'}
          </Button>
          {plant.chatEnabled && (
            <Button
                onClick={() => {
                    onOpenChat(plant);
                    onOpenChange(false);
                }}
                variant="outline"
            >
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat with {plant.name}
            </Button>
           )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Plant
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete(plant.id);
                    onOpenChange(false);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, delete it
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LongPressInfoDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto bg-accent rounded-full p-3 mb-2">
            <GripVertical className="h-8 w-8 text-accent-foreground" />
          </div>
          <DialogTitle className="text-2xl text-center">New Feature: Quick Actions</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Long-press on a plant in your collection to quickly add it to your showcase or delete it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Got it!</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RoomPage() {
  const { user, gameData } = useAuth();
  const { toast } = useToast();
  
  const [collectionPlantIds, setCollectionPlantIds] = useState<number[]>([]);

  // For long press
  const [longPressPlant, setLongPressPlant] = useState<Plant | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showLongPressInfo, setShowLongPressInfo] = useState(false);

  // For Plant Chat
  const [chattingPlant, setChattingPlant] = useState<Plant | null>(null);
  
  useEffect(() => {
    if (gameData) {
        setCollectionPlantIds(gameData.collectionPlantIds || []);
    }
  }, [gameData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const hasSeenInfo = localStorage.getItem('hasSeenLongPressInfo');
        if (!hasSeenInfo) {
          setShowLongPressInfo(true);
        }
    }
  }, []);

  const handleCloseLongPressInfo = (isOpen: boolean) => {
    if (!isOpen) {
      localStorage.setItem('hasSeenLongPressInfo', 'true');
      setShowLongPressInfo(false);
    }
  }

  const allPlants = useMemo(() => gameData?.plants || {}, [gameData]);
  const collectionPlants = useMemo(() => collectionPlantIds.map(id => allPlants[id]).filter(Boolean), [collectionPlantIds, allPlants]);
  
  const handlePointerDown = (plant: Plant) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressPlant(plant);
    }, LONG_PRESS_DURATION);
  };

  const handlePointerUp = (plant: Plant) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeletePlantAction = async (plantId: number) => {
    if (!user) return;
    try {
      await deletePlant(user.uid, plantId);
      toast({
        title: 'Plant Deleted',
        description: `The plant has been removed from your collection.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the plant.' });
    }
  };

  const handleToggleShowcaseAction = async (plantId: number) => {
    if (!user || !gameData) return;
    const currentShowcase = gameData.showcasePlantIds || [];
    let newShowcase: number[];
    let message = '';

    if (currentShowcase.includes(plantId)) {
      newShowcase = currentShowcase.filter((id) => id !== plantId);
      message = 'Plant removed from your showcase.';
    } else {
      if (currentShowcase.length >= MAX_SHOWCASE_PLANTS) {
        toast({
          variant: 'destructive',
          title: 'Showcase Full',
          description: `You can only select up to ${MAX_SHOWCASE_PLANTS} plants.`,
        });
        return;
      }
      newShowcase = [...currentShowcase, plantId];
      message = 'Plant added to your showcase!';
    }

    try {
      await updateShowcasePlants(user.uid, newShowcase);
      toast({ title: 'Showcase Updated', description: message });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your showcase.' });
    }
  };
  
  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const showcaseIds = gameData.showcasePlantIds || [];
  const isPlantInShowcase = !!(longPressPlant && showcaseIds.includes(longPressPlant.id));
  const canAddToShowcase = showcaseIds.length < MAX_SHOWCASE_PLANTS;

  return (
      <div className="space-y-4 bg-white min-h-screen">
        <header className="flex flex-col items-center gap-4 p-4 text-center">
          <h1 className="text-3xl text-primary text-center">My Room</h1>
           <p className="text-muted-foreground">This is your space to view your collection. Go to the Garden to water and care for your plants.</p>
        </header>

        <section className="px-4 pb-4">
            <Card className="p-4">
              <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xl text-primary">My Collection</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 mt-4">
                  {collectionPlants.length > 0 ? (
                    collectionPlants.map((plant) => (
                      <div
                          key={plant.id}
                          onPointerDown={() => handlePointerDown(plant)}
                          onPointerUp={() => handlePointerUp(plant)}
                          onPointerLeave={handlePointerLeave}
                        >
                          <PlantCardUI 
                            plant={plant} 
                            onClick={() => setLongPressPlant(plant)}
                           />
                       </div>
                      ))
                  ) : (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                        Your collection is empty. Go to the Home screen to draw a new plant!
                    </div>
                  )}
              </div>
            </Card>
        </section>

        <PlantActionDialog
          plant={longPressPlant}
          open={!!longPressPlant}
          onOpenChange={(isOpen) => {
            if (!isOpen) setLongPressPlant(null);
          }}
          onDelete={handleDeletePlantAction}
          onToggleShowcase={handleToggleShowcaseAction}
          onOpenChat={(plant) => setChattingPlant(plant)}
          isPlantInShowcase={isPlantInShowcase}
          canAddToShowcase={canAddToShowcase}
        />

        <PlantChatDialog
            plant={chattingPlant}
            open={!!chattingPlant}
            onOpenChange={(isOpen) => {
                if (!isOpen) setChattingPlant(null);
            }}
            userId={user.uid}
        />

        <LongPressInfoDialog open={showLongPressInfo} onOpenChange={handleCloseLongPressInfo} />
      </div>
  );
}
