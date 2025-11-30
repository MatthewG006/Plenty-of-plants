
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { useDraw, refillDraws, MAX_DRAWS } from '@/lib/draw-manager';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2 } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import type { DrawPlantOutput } from '@/interfaces/plant';
import { savePlant, getUserGameData } from '@/lib/firestore';
import { compressImage } from '@/lib/image-compression';
import { NewPlantDialog } from '@/components/plant-dialogs';
import { drawPlantAction } from '@/app/actions/draw-plant';
import { refundDraw } from '@/lib/draw-manager';
import { updateCollectionProgress } from '@/lib/challenge-manager';


// Helper to format time from milliseconds
const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const REFILL_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

export default function Draws() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    const { playSfx } = useAudio();
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);
    const [timeToNextDraw, setTimeToNextDraw] = useState(0);

    const draws = gameData?.draws ?? 0;

    useEffect(() => {
      if (!user) return;
    
      const interval = setInterval(async () => {
        // Refill draws if needed
        await refillDraws(user.uid);
    
        // Recalculate time to next draw
        const latestGameData = await getUserGameData(user.uid);
        if (latestGameData) {
          const now = Date.now();
          const lastRefill = latestGameData.lastDrawRefill || now;
          if (latestGameData.draws < MAX_DRAWS) {
              const timePassed = now - lastRefill;
              const nextRefillTime = REFILL_INTERVAL - (timePassed % REFILL_INTERVAL);
              setTimeToNextDraw(nextRefillTime);
          } else {
              setTimeToNextDraw(0);
          }
        }
      }, 1000);
    
      return () => clearInterval(interval);
    }, [user, gameData]);

    const handleDraw = async () => {
        if (!user || draws <= 0) return;
        
        setIsDrawing(true);
        playSfx('tap');

        try {
            await useDraw(user.uid);
            
            // Get existing plant filenames to avoid duplicates
            const existingImageFilenames = gameData?.plants ? Object.values(gameData.plants).map(p => p.hint) : [];
            
            const plantResult = await drawPlantAction(existingImageFilenames);

            setDrawnPlant(plantResult);
            playSfx('success');
            
        } catch (error) {
            console.error("Failed to draw plant:", error);
            toast({
                title: 'Draw Failed',
                description: 'Could not get a new plant. Your draw has been refunded.',
                variant: 'destructive',
            });
            // Refund the draw if the AI action fails
            await refundDraw(user.uid);
        } finally {
            setIsDrawing(false);
        }
    };
    
    const handleCollectPlant = async () => {
        if (!user || !drawnPlant) return;
        
        try {
            const compressedImageDataUri = await compressImage(drawnPlant.imageDataUri);
            const newPlant = await savePlant(user.uid, { ...drawnPlant, imageDataUri: compressedImageDataUri });
            await updateCollectionProgress(user.uid);
            toast({
                title: 'New Plant Collected!',
                description: `You got a ${newPlant.name}! Find it in your Room.`,
            });
        } catch (e: any) {
             toast({
                variant: "destructive",
                title: "Storage Error",
                description: "Could not save your new plant.",
            });
        }
        
        setDrawnPlant(null);
    }


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Get New Plants</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center gap-4">
                        {Array.from({ length: MAX_DRAWS }).map((_, index) => (
                            <div key={index} className="w-12 h-12 rounded-full border-2 border-primary/50 bg-primary/10 flex items-center justify-center">
                                {index < draws ? (
                                    <Check className="w-8 h-8 text-primary" />
                                ) : (
                                    <X className="w-8 h-8 text-destructive" />
                                )}
                            </div>
                        ))}
                    </div>
                     <p className="text-sm text-muted-foreground text-center">
                        {draws < MAX_DRAWS ? `Next draw in: ${formatTime(timeToNextDraw)}` : "Your draws are full!"}
                    </p>
                    <Button className="w-full text-lg h-12" onClick={handleDraw} disabled={isDrawing || draws <= 0}>
                        {isDrawing ? <Loader2 className="animate-spin" /> : 'Draw a Plant'}
                    </Button>
                </CardContent>
            </Card>
            
            <NewPlantDialog
                plant={drawnPlant}
                open={!!drawnPlant}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCollectPlant();
                    }
                }}
            />
        </>
    );
}
