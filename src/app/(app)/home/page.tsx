'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { Plant } from '@/interfaces/plant';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLANTS_STORAGE_KEY = 'plenty-of-plants-collection';

function DrawnPlantDialog({ plantName, open, onOpenChange }: { plantName: string | undefined; open: boolean; onOpenChange: (open: boolean) => void; }) {
    if (!plantName) return null;
    
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-xs rounded-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center text-2xl font-headline">
                        You drew a {plantName}!
                    </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction className="rounded-full px-8 bg-chart-3 hover:bg-chart-3/90">
                        OK
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function HomePage() {
  const { toast } = useToast();
  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPlant, setDrawnPlant] = useState<DrawPlantOutput | null>(null);

  useEffect(() => {
    const storedPlantsRaw = localStorage.getItem(PLANTS_STORAGE_KEY);
    if (storedPlantsRaw) {
      try {
        const storedPlants: Plant[] = JSON.parse(storedPlantsRaw);
        if (storedPlants.length > 0) {
          setLatestPlant(storedPlants[storedPlants.length - 1]);
        }
      } catch (e) {
        console.error("Failed to parse stored plants on home page", e);
      }
    }
  }, []);

  const handleDraw = async () => {
    setIsDrawing(true);
    try {
      const storedPlantsRaw = localStorage.getItem(PLANTS_STORAGE_KEY);
      const prevPlants: Plant[] = storedPlantsRaw ? JSON.parse(storedPlantsRaw) : [];

      if (prevPlants.length === 0) {
        const fernData: DrawPlantOutput = {
          name: "Friendly Fern",
          description: "A happy little fern to start your collection.",
          imageDataUri: "https://placehold.co/512x512.png",
        };
        setDrawnPlant(fernData);
      } else {
        const result = await drawPlant();
        setDrawnPlant(result);
      }
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

  const handleCollect = () => {
    if (!drawnPlant) return;

    const storedPlantsRaw = localStorage.getItem(PLANTS_STORAGE_KEY);
    const prevPlants: Plant[] = storedPlantsRaw ? JSON.parse(storedPlantsRaw) : [];

    const newPlant: Plant = {
        id: (prevPlants[prevPlants.length - 1]?.id || 0) + 1,
        name: drawnPlant.name,
        form: 'Base',
        image: drawnPlant.imageDataUri,
        hint: drawnPlant.name === 'Friendly Fern' ? 'fern plant' : drawnPlant.name.toLowerCase().split(' ').slice(0, 2).join(' '),
    };

    const updatedPlants = [...prevPlants, newPlant];
    localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(updatedPlants));
    
    setLatestPlant(newPlant);
    setDrawnPlant(null);
  };


  return (
    <div className="p-4 space-y-6 bg-background">
      <header className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
        <h1 className="font-headline text-3xl text-chart-2 font-bold">
          Plenty Of Plants
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </Button>
      </header>

      <main className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">Your Latest Collection</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[260px]">
            {latestPlant ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
                  <Image
                    src={latestPlant.image}
                    alt={latestPlant.name}
                    width={192}
                    height={192}
                    className="object-cover w-full h-full"
                    data-ai-hint={latestPlant.hint}
                  />
                </div>
                <h3 className="text-xl font-headline text-primary">{latestPlant.name}</h3>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No plants collected yet. Time to draw one!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="items-center">
            <CardTitle className="text-xl font-semibold">Free Draws Available</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-chart-3">
                  <Check className="h-8 w-8 text-white" />
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                  <X className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <Button onClick={handleDraw} disabled={isDrawing} size="lg" className="w-full font-semibold rounded-full mt-2">
              {isDrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drawing...
                </>
              ) : (
                'Draw New Plant'
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              New draw available every 12 hours (max 2 slots).
            </p>
          </CardContent>
        </Card>
      </main>
      
      <DrawnPlantDialog
        plantName={drawnPlant?.name}
        open={!!drawnPlant}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCollect();
          }
        }}
      />
    </div>
  );
}
