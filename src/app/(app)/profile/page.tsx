
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, LogOut, Coins, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Plant } from '@/interfaces/plant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface ProfileData {
  username: string;
  email: string;
  gameId: string;
  avatarColor?: string;
  gold?: number;
}

function InfoRow({ icon: Icon, label, value, valueClassName }: { icon?: React.ElementType, label: string, value: string | number, valueClassName?: string }) {
  return (
    <div className="flex items-center justify-start gap-4 py-3">
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      <p className="text-muted-foreground w-32">{label}</p>
      <p className={cn("font-semibold text-primary", valueClassName)}>{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const { user, gameData } = useAuth();
  const router = useRouter();

  const [plantsCollected, setPlantsCollected] = useState(0);
  const [plantsEvolved, setPlantsEvolved] = useState(0);
  
  useEffect(() => {
    if (!user) {
        router.push('/');
    }
  }, [user, router]);
  
  useEffect(() => {
    if (gameData) {
        const collectionPlants: Plant[] = gameData.collection || [];
        const deskPlants: Plant[] = (gameData.desk || []).filter((p: Plant | null): p is Plant => p !== null);
        const allPlants = [...collectionPlants, ...deskPlants];

        setPlantsCollected(allPlants.length);
        const evolvedCount = allPlants.filter(p => p.form !== 'Base').length;
        setPlantsEvolved(evolvedCount);
    }
  }, [gameData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (e) {
      console.error("Failed to log out", e);
    }
  };

  if (!user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const profileData: ProfileData = {
      username: user.displayName || 'PlantLover',
      email: user.email || 'you@example.com',
      gameId: `#${user.uid.slice(0, 8).toUpperCase()}`,
      gold: gameData.gold || 0,
      avatarColor: (gameData as any).avatarColor || 'hsl(120, 70%, 85%)'
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-2xl text-primary">My Profile</h1>
      </header>

      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src="" alt="User avatar" />
            <AvatarFallback style={{ backgroundColor: profileData.avatarColor }} className="text-4xl font-bold text-primary/70">
              {profileData.username ? profileData.username.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="font-headline text-2xl">{profileData.username}</CardTitle>
          <p className="text-muted-foreground">{profileData.gameId}</p>
        </CardHeader>
        <CardContent>
          <Separator className="my-2"/>
          <InfoRow label="Email" value={profileData.email} valueClassName="text-xs" />
          <Separator />
          <InfoRow label="Gold" value={profileData.gold ?? 0} valueClassName="text-xs" icon={Coins} />
          <Separator />
          <InfoRow label="Plants Collected" value={plantsCollected} valueClassName="text-xs" />
          <Separator />
          <InfoRow label="Plants Evolved" value={plantsEvolved} valueClassName="text-xs" />
        </CardContent>
      </Card>

      <Card>
          <CardContent className="pt-6">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be returned to the login screen. Your plant collection is saved to your account.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                        Yes, log out
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
      </Card>
    </div>
  );
}
