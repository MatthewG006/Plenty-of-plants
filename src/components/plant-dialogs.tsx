
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Leaf, Loader2, Sparkles, Gem, MessageCircle, Trash2, Droplet, Coins, Replace, Eye, Edit, Star } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { deletePlant, unlockPlantChat, addConversationHistory, updatePlant, updateUserGold, updateUserRubies, useWaterRefill, addSeed, useGlitter, useSheen, useRainbowGlitter, useRedGlitter } from '@/lib/firestore';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription as AlertDialogDescriptionComponent } from '@/components/ui/alert-dialog';
import { plantChatAction } from '@/app/actions/plant-chat';
import { Textarea } from '@/components/ui/textarea';
import { updateWaterEvolvedProgress, updateWateringProgress, updateApplySheenProgress, updateApplyGlitterProgress } from '@/lib/challenge-manager';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';


const XP_PER_LEVEL = 1000;
const EVOLUTION_LEVEL = 10;
const SECOND_EVOLUTION_LEVEL = 25;
const MAX_LEVEL = 50;

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

export function PlantChatDialog({ plant, open, onOpenChange, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, userId: string }) {
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
            await addConversationHistory(userId, plant.id, newUserMessage.content, newModelMessage.content);
            playSfx('chime');

        } catch (e) {
            console.error("Chat error:", e);
            setHistory(history); 
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

export function PlantCareDialog({ plant, open, onOpenChange, onStartEvolution, onSwapRequest }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onStartEvolution: (plant: Plant) => void, onSwapRequest: (plantId: number, gardenPlotIndex: number) => void }) {
    return null;
}


export function EvolveConfirmationDialog({ plant, open, onConfirm, onCancel, isEvolving }: { plant: Plant | null, open: boolean, onConfirm: () => void, onCancel: () => void, isEvolving: boolean }) {
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

export function EvolvePreviewDialog({ plantName, newForm, newImageUri, open, onConfirm }: { plantName: string, newForm: string, newImageUri: string, open: boolean, onConfirm: () => void }) {
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

export function PlantSwapDialog({ open, onOpenChange, collectionPlants, onSelectPlant }: { open: boolean, onOpenChange: (open: boolean) => void, collectionPlants: Plant[], onSelectPlant: (plantId: number) => void }) {
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center text-primary">Swap Plant</DialogTitle>
                    <DialogDescription className="text-center">Select a plant from your collection to place in the garden.</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-96">
                    <div className="p-4 grid grid-cols-3 gap-4">
                        {collectionPlants.length > 0 ? (
                            collectionPlants.map(plant => (
                                <Card 
                                    key={plant.id} 
                                    className="cursor-pointer hover:scale-105 transition-transform" 
                                    onClick={() => onSelectPlant(plant.id)}
                                >
                                    <CardContent className="p-0">
                                        <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                                            {plant.image !== 'placeholder' ? (
                                                <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                                            ) : (
                                                <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div className="p-2 text-center bg-white/50">
                                            <p className="text-xs font-semibold text-primary truncate">{plant.name}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="col-span-3 text-center text-muted-foreground">Your collection is empty.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export function ContestPlantSelectionDialog({ open, onOpenChange, allPlants, onSelectPlant }: { open: boolean, onOpenChange: (open: boolean) => void, allPlants: Plant[], onSelectPlant: (plant: Plant) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center text-primary">Choose Your Contestant</DialogTitle>
                    <DialogDescription className="text-center">Select a plant to enter into the beauty contest.</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-96">
                    <div className="p-4 grid grid-cols-3 gap-4">
                        {allPlants.length > 0 ? (
                            allPlants.map(plant => (
                                <Card 
                                    key={plant.id}
                                    className="cursor-pointer hover:scale-105 transition-transform" 
                                    onClick={() => onSelectPlant(plant)}
                                >
                                    <CardContent className="p-0">
                                        <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                                            {plant.image !== 'placeholder' ? (
                                                <Image src={plant.image} alt={plant.name} fill sizes="100px" className="object-cover" data-ai-hint={plant.hint} />
                                            ) : (
                                                <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div className="p-2 text-center bg-white/50">
                                            <p className="text-xs font-semibold text-primary truncate">{plant.name}</p>
                                            <p className="text-[10px] text-muted-foreground">Lvl {plant.level}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="col-span-3 text-center text-muted-foreground">You have no plants to enter.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


export function PlantDetailDialog({ plant, open, onOpenChange, onStartEvolution, onOpenChat, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onStartEvolution: (plant: Plant) => void, onOpenChat: (plant: Plant) => void, userId: string }) {
    const { playSfx } = useAudio();
    const { toast } = useToast();
    const { gameData } = useAuth();
    
    if (!plant || !userId || !gameData) return null;

    const shouldEvolve = (plant.level >= EVOLUTION_LEVEL && plant.form === 'Base') || (plant.level >= SECOND_EVOLUTION_LEVEL && plant.form === 'Evolved');
    const isMaxLevel = plant.level >= MAX_LEVEL;

    const handleApplyGlitter = async () => {
        if (gameData.glitterCount > 0) {
            await useGlitter(userId);
            await updatePlant(userId, plant.id, { 
                hasGlitter: true,
                hasSheen: false,
                hasRainbowGlitter: false,
                hasRedGlitter: false,
            });
            await updateApplyGlitterProgress(userId);
            toast({ title: 'Sparkles!', description: `${plant.name} is now sparkling.`});
        }
    };

    const handleApplySheen = async () => {
        if (gameData.sheenCount > 0) {
            await useSheen(userId);
            await updatePlant(userId, plant.id, {
                hasGlitter: false,
                hasSheen: true,
                hasRainbowGlitter: false,
                hasRedGlitter: false,
            });
            await updateApplySheenProgress(userId);
            toast({ title: 'So Shiny!', description: `${plant.name} now has a beautiful sheen.`});
        }
    };

    const handleApplyRainbowGlitter = async () => {
        if (gameData.rainbowGlitterCount > 0) {
            await useRainbowGlitter(userId);
            await updatePlant(userId, plant.id, {
                hasGlitter: false,
                hasSheen: false,
                hasRainbowGlitter: true,
                hasRedGlitter: false,
            });
            toast({ title: 'Rainbow Power!', description: `${plant.name} is sparkling with all the colors of the rainbow.`});
        }
    };

    const handleApplyRedGlitter = async () => {
        if (gameData.redGlitterCount > 0) {
            await useRedGlitter(userId);
            await updatePlant(userId, plant.id, {
                hasGlitter: false,
                hasSheen: false,
                hasRainbowGlitter: false,
                hasRedGlitter: true,
            });
            toast({ title: 'Fiery!', description: `${plant.name} is now sparkling with red glitter.`});
        }
    };

    const handleUnlockChat = async () => {
        if (gameData.plantChatTokens > 0 && !plant.chatEnabled) {
            try {
                await unlockPlantChat(userId, plant.id);
                playSfx('success');
                toast({ title: 'Chat Unlocked!', description: `You can now talk to ${plant.name}!`});
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: e.message });
            }
        }
    }

    const handleDeletePlant = async () => {
        try {
            await deletePlant(userId, plant.id);
            onOpenChange(false);
            toast({ title: 'Plant Deleted', description: `${plant.name} has been removed from your collection.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete plant.' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-3xl text-center text-primary">{plant.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 pt-4">
                    <div className="w-64 h-64 relative">
                        <div className="rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100 flex items-center justify-center h-full">
                            {plant.image && plant.image !== 'placeholder' ? (
                                <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                            ) : (
                                <Leaf className="w-24 h-24 text-muted-foreground/50" />
                            )}
                        </div>
                        {plant.hasGlitter && <GlitterAnimation />}
                        {plant.hasRedGlitter && <RedGlitterAnimation />}
                        {plant.hasSheen && <SheenAnimation />}
                        {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                    </div>

                    <p className="text-muted-foreground text-center mt-2 px-4">{plant.description}</p>
                    
                     <div className="w-full px-4 space-y-2">
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <p className="text-lg font-semibold text-primary">Level {plant.level}</p>
                                <p className="text-sm text-muted-foreground">{isMaxLevel ? "MAX" : `${plant.xp} / ${XP_PER_LEVEL} XP`}</p>
                            </div>
                            <Progress value={isMaxLevel ? 100 : (plant.xp / XP_PER_LEVEL) * 100} className="w-full" />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Form: <span className="font-semibold text-primary">{plant.form}</span></span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="pt-2 flex-col sm:flex-col sm:space-x-0 gap-2">
                     <Card>
                        <CardContent className="p-3 grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={handleApplyGlitter} disabled={gameData.glitterCount <= 0 || plant.hasGlitter}>
                                <Sparkles /> Glitter ({gameData.glitterCount})
                            </Button>
                             <Button variant="outline" size="sm" onClick={handleApplySheen} disabled={gameData.sheenCount <= 0 || plant.hasSheen}>
                                <Star /> Sheen ({gameData.sheenCount})
                            </Button>
                             <Button variant="outline" size="sm" onClick={handleApplyRainbowGlitter} disabled={gameData.rainbowGlitterCount <= 0 || plant.hasRainbowGlitter}>
                                <Sparkles className="text-pink-500"/> Rainbow ({gameData.rainbowGlitterCount})
                            </Button>
                             <Button variant="outline" size="sm" onClick={handleApplyRedGlitter} disabled={gameData.redGlitterCount <= 0 || plant.hasRedGlitter}>
                                <Sparkles className="text-red-500" /> Red ({gameData.redGlitterCount})
                            </Button>
                        </CardContent>
                     </Card>

                    {shouldEvolve && !isMaxLevel && (
                         <Button onClick={() => { onOpenChange(false); onStartEvolution(plant); }} className="w-full">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Evolve Plant
                        </Button>
                    )}
                    {isMaxLevel && plant.personality && (
                        plant.chatEnabled ? (
                             <Button onClick={() => onOpenChat(plant)} className="w-full">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Chat with Plant
                            </Button>
                        ) : (
                             <Button onClick={handleUnlockChat} className="w-full" disabled={gameData.plantChatTokens <= 0}>
                                <Gem className="mr-2 h-4 w-4" />
                                Unlock Chat ({gameData.plantChatTokens} token(s))
                            </Button>
                        )
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Plant
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescriptionComponent>This action cannot be undone. This will permanently delete {plant.name}.</AlertDialogDescriptionComponent>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeletePlant} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DialogClose asChild>
                        <Button className="w-full" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
