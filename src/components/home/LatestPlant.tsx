
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';
import type { Plant } from '@/interfaces/plant';
import { PlantDetailDialog } from '@/components/plant-dialogs';


export default function LatestPlant() {
  const { user, gameData } = useAuth();
  const [latestPlant, setLatestPlant] = useState<Plant | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  useEffect(() => {
    if (gameData && gameData.plants) {
      const plantsArray = Object.values(gameData.plants);
      if (plantsArray.length > 0) {
        // Assuming acquiredDate is available and is a string that can be converted to a Date
        const sortedPlants = [...plantsArray].sort((a, b) => new Date(b.acquiredDate).getTime() - new Date(a.acquiredDate).getTime());
        setLatestPlant(sortedPlants[0]);
      }
    }
  }, [gameData]);

  const handleViewDetails = () => {
    if (latestPlant) {
      setIsDetailViewOpen(true);
    }
  };

  if (!latestPlant || !user) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Your Latest Plant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/20 p-2 bg-white">
            <Image src={latestPlant.image} alt={latestPlant.name} width={200} height={200} className="object-cover w-full h-full" data-ai-hint={latestPlant.hint} />
          </div>
          <h3 className="text-xl font-semibold text-primary">{latestPlant.name}</h3>
          <Button variant="outline" onClick={handleViewDetails}>View Details</Button>
        </CardContent>
      </Card>
      <PlantDetailDialog
        plant={latestPlant}
        open={isDetailViewOpen}
        onOpenChange={setIsDetailViewOpen}
        userId={user.uid}
        onStartEvolution={() => {}} // Not needed on home page
        onOpenChat={() => {}} // Not needed on home page
      />
    </>
  );
}
