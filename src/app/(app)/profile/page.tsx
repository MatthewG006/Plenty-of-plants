
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';

interface UserData {
  username: string;
  email: string;
  gameId: string;
}

const PLANTS_DATA_STORAGE_KEY = 'plenty-of-plants-data';
const USER_DATA_STORAGE_KEY = 'plenty-of-plants-user';

function InfoRow({ label, value, valueClassName }: { label: string, value: string | number, valueClassName?: string }) {
  return (
    <div className="flex items-center justify-start gap-4 py-3">
      <p className="text-muted-foreground w-32">{label}</p>
      <p className={cn("font-semibold text-primary", valueClassName)}>{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const [plantsCollected, setPlantsCollected] = useState(0);
  const [plantsEvolved, setPlantsEvolved] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    username: 'PlantLover',
    email: 'you@example.com',
    gameId: '#GAMEID00000'
  });

  useEffect(() => {
    // Load plant data
    let storedDataRaw;
    try {
        storedDataRaw = localStorage.getItem(PLANTS_DATA_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to read localStorage on profile page", e);
    }
    
    if (storedDataRaw) {
      try {
        const storedData = JSON.parse(storedDataRaw);
        const collectionPlants: Plant[] = storedData.collection || [];
        const deskPlants: Plant[] = (storedData.desk || []).filter((p: Plant | null): p is Plant => p !== null);
        const allPlants = [...collectionPlants, ...deskPlants];

        setPlantsCollected(allPlants.length);
        
        const evolvedCount = allPlants.filter(p => p.form !== 'Base').length;
        setPlantsEvolved(evolvedCount);
      } catch (e) {
        console.error("Failed to parse stored plants on profile page", e);
        setPlantsCollected(0);
        setPlantsEvolved(0);
      }
    }

    // Load user data
    let storedUserRaw;
    try {
        storedUserRaw = localStorage.getItem(USER_DATA_STORAGE_KEY);
    } catch(e) {
      console.error("Failed to read user data from localStorage", e);
    }

    if (storedUserRaw) {
      try {
        const storedUser = JSON.parse(storedUserRaw);
        setUserData(storedUser);
      } catch (e) {
        console.error("Failed to parse user data on profile page", e);
      }
    }
  }, []);

  return (
    <div className="p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-2xl text-primary">My Profile</h1>
      </header>

      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src="https://placehold.co/100x100.png" alt="User avatar" data-ai-hint="profile picture" />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="font-headline text-2xl">{userData.username}</CardTitle>
          <p className="text-muted-foreground">{userData.gameId}</p>
        </CardHeader>
        <CardContent>
          <Separator className="my-2"/>
          <InfoRow label="Email" value={userData.email} valueClassName="text-xs" />
          <Separator />
          <InfoRow label="Plants Collected" value={plantsCollected} valueClassName="text-xs" />
          <Separator />
          <InfoRow label="Plants Evolved" value={plantsEvolved} valueClassName="text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}

    