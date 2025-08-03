
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Leaf, Loader2, Sparkles, Gem, MessageCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { deletePlant, unlockPlantChat, addConversationHistory } from '@/lib/firestore';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription as AlertDialogDescriptionComponent } from '@/components/ui/alert-dialog';
import { plantChatAction } from '@/app/actions/plant-chat';
import { Textarea } from '@/components/ui/textarea';

const XP_PER_LEVEL = 1000;
const EVOLUTION_LEVEL = 10;
const SECOND_EVOLUTION_LEVEL = 25;


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

export function PlantDetailDialog({ plant, open, onOpenChange, onStartEvolution, onOpenChat, userId }: { plant: Plant | null, open: boolean, onOpenChange: (open: boolean) => void, onStartEvolution: (plant: Plant) => void, onOpenChat: (plant: Plant) => void, userId: string }) {
    const { playSfx } = useAudio();
    const { toast } = useToast();
    const { gameData } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingBase, setViewingBase] = useState(false);
    const [isUnlockingChat, setIsUnlockingChat] = useState(false);

    useEffect(() => {
        // Reset view when dialog opens or plant changes
        setViewingBase(false);
    }, [plant, open]);

    if (!plant || !gameData) return null;
    
    const displayName = viewingBase ? `Base: ${plant.name}` : plant.name;
    const displayImage = viewingBase ? plant.baseImage : plant.image;
    
    const shouldEvolve = (plant.level >= EVOLUTION_LEVEL && plant.form === 'Base') || (plant.level >= SECOND_EVOLUTION_LEVEL && plant.form === 'Evolved');

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
                    </div>

                    <p className="text-muted-foreground text-center mt-2 px-4">{plant.description}</p>
                    
                    <div className="w-full px-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold text-primary">Level {plant.level}</p>
                             <p className="text-sm text-muted-foreground">{plant.xp} / {XP_PER_LEVEL} XP</p>
                        </div>
                        <Progress value={(plant.xp / XP_PER_LEVEL) * 100} className="w-full" />
                    </div>

                </div>
                <DialogFooter className="pt-2 flex-col sm:flex-col sm:space-x-0 gap-2">
                    {shouldEvolve && (
                         <Button onClick={() => { onStartEvolution(plant); onOpenChange(false); }} className="w-full">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Evolve Plant
                        </Button>
                    )}
                    <DialogClose asChild>
                        <Button className="w-full" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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
