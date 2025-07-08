import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Leaf } from 'lucide-react';
import Image from 'next/image';

const collectedPlants = [
  { id: 1, name: 'Smiling Succulent', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'succulent plant' },
  { id: 2, name: 'Prickly Pear', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'cactus plant' },
  { id: 3, name: 'Fern Friend', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'fern plant' },
  { id: 4, name: 'Orchid Obession', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'orchid flower' },
  { id: 5, name: 'Bonsai Buddy', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'bonsai tree' },
  { id: 6, name: 'Aloe Ally', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'aloe vera' },
  { id: 7, name: 'Snakey Sansevieria', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'snake plant' },
  { id: 8, name: 'Pothos Pal', form: 'Base', image: 'https://placehold.co/300x300.png', hint: 'pothos plant' },
];

function PlantPot() {
    return (
        <div className="flex flex-col items-center gap-1 text-primary/70">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2.4a5.3 5.3 0 0 1-2.9 4.8 6.2 6.2 0 0 0-1.1 1.6 4.2 4.2 0 0 0-1 2.2H16a4.2 4.2 0 0 0-1-2.2 6.2 6.2 0 0 0-1.1-1.6A5.3 5.3 0 0 1 12 4.4V2Z"/><path d="M10 13H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5"/><path d="M10 13v-1.4a2.4 2.4 0 0 1 1-2.1 2.4 2.4 0 0 1 2 0 2.4 2.4 0 0 1 1 2.1V13"/></svg>
            <p className="text-xs font-semibold">Empty Pot</p>
        </div>
    )
}

export default function RoomPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between p-4">
        <h1 className="font-headline text-2xl text-primary">My Room</h1>
        <Button variant="secondary" className="font-semibold">
          <Leaf className="mr-2 h-4 w-4" />
          1 Free Draw
        </Button>
      </header>

      <section className="p-4">
        <div className="rounded-lg border-2 border-dashed bg-card/50 p-6" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%238B4513\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}>
            <div className="flex items-center justify-around">
                <PlantPot />
                <PlantPot />
                <PlantPot />
            </div>
        </div>
      </section>

      <section className="flex-1 px-4 pb-4">
         <h2 className="mb-4 font-headline text-xl text-primary">My Collection</h2>
         <ScrollArea className="h-[calc(100vh-420px)]">
             <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
                 {collectedPlants.map((plant) => (
                     <Card key={plant.id} className="group overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-md">
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
                 ))}
             </div>
         </ScrollArea>
      </section>
    </div>
  );
}
