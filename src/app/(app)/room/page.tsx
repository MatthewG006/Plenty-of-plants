'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { drawPlant, type DrawPlantOutput } from '@/ai/flows/draw-plant-flow';
import { Leaf, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';

const OLD_PLANTS_STORAGE_KEY = 'plenty-of-plants-collection';
const PLANTS_DATA_STORAGE_KEY = 'plenty-of-plants-data';
const NUM_POTS = 3;

function PlantPot() {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-primary/70">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2.4a5.3 5.3 0 0 1-2.9 4.8 6.2 6.2 0 0 0-1.1 1.6 4.2 4.2 0 0 0-1 2.2H16a4.2 4.2 0 0 0-1-2.2 6.2 6.2 0 0 0-1.1-1.6A5.3 5.3 0 0 1 12 4.4V2Z"/><path d="M10 13H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5"/><path d="M10 13v-1.4a2.4 2.4 0 0 1 1-2.1 2.4 2.4 0 0 1 2 0 2.4 2.4 0 0 1 1 2.1V13"/></svg>
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
                    <div className="w-64 h-64 rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100">
                        <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
                    </div>
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


export default function RoomPage() {
  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlant, setNewPlant] = useState<DrawPlantOutput | null>(null);
  const [collectedPlants, setCollectedPlants] = useState<Plant[]>([]);
  const [deskPlants, setDeskPlants] = useState<(Plant | null)[]>(Array(NUM_POTS).fill(null));
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);
  const [draggedOverPot, setDraggedOverPot] = useState<number | null>(null);

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

  useEffect(() => {
    if (collectedPlants.length === 0 && deskPlants.every(p => p === null)) {
      const storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
      if (storedDataRaw) return;
    }
    const dataToStore = {
      collection: collectedPlants,
      desk: deskPlants,
    };
    localStorage.setItem(PLANTS_DATA_STORAGE_KEY, JSON.stringify(dataToStore));
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
  
  const handleCollect = (plantToCollect: DrawPlantOutput) => {
    const allPlants = [...collectedPlants, ...deskPlants.filter((p): p is Plant => p !== null)];
    const lastId = allPlants.reduce((maxId, p) => Math.max(p.id, maxId), 0);

    const newPlant: Plant = {
        id: lastId + 1,
        name: plantToCollect.name,
        form: 'Base',
        image: plantToCollect.imageDataUri,
        hint: plantToCollect.name.toLowerCase().split(' ').slice(0, 2).join(' '),
    };
    setCollectedPlants(prevPlants => [...prevPlants, newPlant]);
  };

  const handleDragStart = (e: React.DragEvent, plant: Plant) => {
    e.dataTransfer.setData('plantId', plant.id.toString());
    setDraggedPlant(plant);
  };
  
  const handleDragEnd = () => {
    setDraggedPlant(null);
    setDraggedOverPot(null);
  };

  const handleDragOver = (e: React.DragEvent, potIndex: number) => {
    e.preventDefault();
    if (deskPlants[potIndex] === null) {
      setDraggedOverPot(potIndex);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverPot(null);
  };

  const handleDrop = (e: React.DragEvent, potIndex: number) => {
    e.preventDefault();
    setDraggedOverPot(null);
    setDraggedPlant(null);

    if (deskPlants[potIndex]) {
      return;
    }
    
    const plantId = parseInt(e.dataTransfer.getData('plantId'), 10);
    if (!plantId) return;

    const plantToMove = collectedPlants.find(p => p.id === plantId);
    if (!plantToMove) return;

    const newDeskPlants = [...deskPlants];
    newDeskPlants[potIndex] = plantToMove;
    setDeskPlants(newDeskPlants);

    setCollectedPlants(prev => prev.filter(p => p.id !== plantId));
  };


  return (
    <div className="flex h-screen flex-col">
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

      <section className="p-4">
        <div
          className="h-48 rounded-lg border-2 border-primary/20 bg-cover bg-center p-6"
          style={{ backgroundImage: 'url(/desk.jpg)' }}
        >
          <div className="flex h-full items-end justify-around">
            {deskPlants.map((plant, index) => (
                <div
                    key={index}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragLeave={handleDragLeave}
                    className="relative flex h-24 w-20 items-center justify-center rounded-lg transition-colors"
                >
                    {plant ? (
                        <div className="flex flex-col items-center text-center cursor-pointer" onClick={() => setSelectedPlant(plant)}>
                            <div className="relative h-16 w-16">
                                <Image src={plant.image} alt={plant.name} fill className="object-contain" data-ai-hint={plant.hint} />
                            </div>
                            <p className="mt-1 text-xs font-semibold text-primary truncate w-full">{plant.name}</p>
                        </div>
                    ) : draggedOverPot === index && draggedPlant ? (
                        <div className="flex flex-col items-center text-center opacity-60 pointer-events-none">
                           <div className="relative h-16 w-16">
                               <Image src={draggedPlant.image} alt={draggedPlant.name} fill className="object-contain" data-ai-hint={draggedPlant.hint} />
                           </div>
                           <p className="mt-1 text-xs font-semibold text-primary truncate w-full">{draggedPlant.name}</p>
                       </div>
                    ) : (
                        <PlantPot />
                    )}
                </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col overflow-hidden px-4 pb-4">
         <h2 className="shrink-0 mb-4 font-headline text-xl text-primary">My Collection</h2>
         <ScrollArea className="flex-1">
             <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
                 {collectedPlants.length > 0 ? (
                    collectedPlants.map((plant) => (
                        <Card 
                            key={plant.id}
                            draggable 
                            onDragStart={(e) => handleDragStart(e, plant)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setSelectedPlant(plant)}
                            className="group overflow-hidden cursor-grab transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing shadow-md"
                        >
                            <CardContent className="p-0">
                                <div className="aspect-square relative">
                                    <Image src={plant.image} alt={plant.name} fill className="object-cover" data-ai-hint={plant.hint} />
                                </div>
                                <div className="p-2 text-center bg-white/50">
                                    <p className="text-sm font-semibold text-primary truncate">{plant.name}</p>
                                    <p className="text-xs text-muted-foreground">{plant.form}</p>
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <p className="text-white font-headline text-lg">View</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                 ) : (
                    <div className="col-span-3 text-center text-muted-foreground py-8">
                        Your collection is empty. Go to the Home screen to draw a new plant!
                    </div>
                 )}
             </div>
         </ScrollArea>
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
    </div>
  );
}
