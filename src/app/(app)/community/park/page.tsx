
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import type { Plant } from '@/interfaces/plant';
import { makeBackgroundTransparent } from '@/lib/image-compression';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/context/AudioContext';

export default function ParkPage() {
  const { gameData } = useAuth();
  const { playSfx } = useAudio();
  const router = useRouter();

  const [displayPlant, setDisplayPlant] = useState<Plant | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContestDialog, setShowContestDialog] = useState(false);

  useEffect(() => {
    async function setupPlant() {
      if (gameData?.plants) {
        const allPlants = Object.values(gameData.plants);
        if (allPlants.length > 0) {
          const plantToShow = allPlants[0]; // Display the first plant
          setDisplayPlant(plantToShow);
          try {
            const transparentImage = await makeBackgroundTransparent(plantToShow.image);
            setProcessedImage(transparentImage);
          } catch (e) {
            console.error("Failed to process image for park display:", e);
            setProcessedImage(plantToShow.image); // Fallback to original
          }
        }
      }
      setIsLoading(false);
    }
    setupPlant();
  }, [gameData]);

  const handleChatBubbleClick = () => {
    playSfx('tap');
    setShowContestDialog(true);
  };
  
  const handleGoToContest = () => {
    playSfx('whoosh');
    router.push('/community/contest');
  };

  return (
    <>
      <div
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between text-white p-4 relative"
        style={{ backgroundImage: "url('/park.png')" }}
      >
        <div className="absolute top-4 left-4 z-10">
            <Button asChild>
                <Link href="/community">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Showcase
                </Link>
            </Button>
        </div>
        
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 bg-black/50 px-16 py-8 rounded-lg text-center shadow-lg backdrop-blur-sm z-0">
          <h1 className="text-3xl font-bold mb-4 leading-tight">Welcome to<br />the Park</h1>
           <p className="text-base leading-tight">A quiet place to relax<br />before the contest.</p>
        </div>

        <div className="w-full h-1/3 absolute bottom-0 left-0 flex items-end justify-start p-4 pointer-events-none">
          {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : processedImage ? (
            <div className="relative w-48 h-48 animate-fade-in-up">
              <div 
                className="absolute -top-8 left-1/2 -translate-x-1/4 w-24 h-12 bg-white rounded-full flex items-center justify-center cursor-pointer pointer-events-auto shadow-lg animate-pulse-subtle"
                onClick={handleChatBubbleClick}
              >
                <p className="text-black font-bold text-xl tracking-widest">...</p>
              </div>
              <Image 
                  src={processedImage} 
                  alt={displayPlant?.name || 'A plant'} 
                  fill 
                  className="object-contain"
                  data-ai-hint={displayPlant?.hint}
              />
            </div>
          ) : null}
        </div>
      </div>
      <AlertDialog open={showContestDialog} onOpenChange={setShowContestDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Enter the Plant Beauty Contest?</AlertDialogTitle>
            <AlertDialogDescription>
                A new contest is starting soon. Would you like to check it out?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Maybe later</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToContest}>
                Yes, let's go!
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
