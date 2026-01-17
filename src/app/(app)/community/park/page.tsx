
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquare, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import type { Plant } from '@/interfaces/plant';
import Image from 'next/image';
import { useAudio } from '@/context/AudioContext';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';


export default function ParkPage() {
  const { gameData, loading: authLoading } = useAuth();
  const { playSfx } = useAudio();
  const { toast } = useToast();

  const [displayPlant, setDisplayPlant] = useState<Plant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function setupPlant() {
      if (gameData?.plants) {
        const allPlants: Plant[] = Object.values(gameData.plants);
        if (allPlants.length > 0) {
          const plantToShow = allPlants[0]; // Display the first plant
          setDisplayPlant(plantToShow);
        }
      }
      setIsLoading(false);
    }
    if (!authLoading) {
      setupPlant();
    }
  }, [gameData, authLoading]);

  const handleChatBubbleClick = () => {
    playSfx('tap');
    toast({
        title: 'A Quiet Moment',
        description: `${displayPlant?.name || 'Your plant'} seems to be enjoying the peacefulness of the park.`
    });
  };
  
  if (authLoading || (isLoading && authLoading)) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between text-white p-4 relative"
        style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/park.png?alt=media&token=e8ab2d4a-d8a5-49a7-96a3-46cc4e4b6a6f')" }}
      >
        <div className="absolute top-4 left-4 z-10">
            <Button asChild variant="secondary">
                <Link href="/community">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Showcase
                </Link>
            </Button>
        </div>
        
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4 mt-16">
          <div className="bg-black/50 p-6 rounded-lg text-center shadow-lg backdrop-blur-sm z-0">
            <h1 className="text-4xl font-bold mb-2">Welcome to<br />the Park</h1>
             <p className="text-lg mb-4">A quiet place to relax... or compete!</p>
             <Button asChild>
                <Link href="/community/contest">
                    <Trophy className="mr-2 h-4 w-4" />
                    Enter Plant Beauty Contest
                </Link>
             </Button>
          </div>
        </div>

        <div className="w-full h-1/3 absolute bottom-10 left-0 flex items-end justify-start p-4 pointer-events-none">
          {displayPlant ? (
            <div className="relative w-48 h-48 animate-fade-in-up">
              <div 
                className="absolute -top-8 left-1/2 -translate-x-1/4 w-24 h-12 bg-white rounded-full flex items-center justify-center cursor-pointer pointer-events-auto shadow-lg animate-pulse-subtle"
                onClick={handleChatBubbleClick}
              >
                 <MessageSquare className="w-8 h-8 text-black" />
              </div>
              <Image 
                  src={displayPlant.image} 
                  alt={displayPlant?.name || 'A plant'} 
                  fill 
                  className="object-contain [mix-blend-mode:multiply]"
                  data-ai-hint={displayPlant?.hint}
                  unoptimized
              />
            </div>
          ) : !isLoading ? (
             <div className="relative w-48 h-48 animate-fade-in-up">
                <p className="text-white bg-black/50 p-2 rounded-lg">Go draw a plant to see it here!</p>
             </div>
          ): null }
        </div>
      </div>
    </>
  );
}
