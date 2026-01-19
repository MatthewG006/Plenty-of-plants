
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, LogOut, Coins, Loader2, Leaf, Sparkles, CheckCircle2, Trash2, Share2, LogIn } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
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
import { useToast } from '@/hooks/use-toast';
import { updateShowcasePlants } from '@/lib/firestore';
import Link from 'next/link';

const MAX_SHOWCASE_PLANTS = 5;

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

function SheenAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
            <div className="absolute -top-1/2 -left-1/2 w-1/12 h-[200%] bg-white/30 animate-sheen" />
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

function GlitterAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
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

function ShowcasePlantCard({ plant, isSelected, onSelect }: { plant: Plant, isSelected: boolean, onSelect: () => void }) {
    return (
        <Card 
            onClick={onSelect}
            className={cn(
                "group overflow-hidden shadow-md w-full cursor-pointer transition-all duration-200",
                isSelected && "ring-2 ring-primary ring-offset-2",
                !isSelected && "hover:scale-105"
            )}
        >
            <CardContent className="p-0 relative">
                <div className="aspect-square relative flex items-center justify-center bg-muted/30">
                     {plant.image !== 'placeholder' ? (
                        <Image 
                            src={plant.image} 
                            alt={plant.name} 
                            fill 
                            sizes="(max-width: 768px) 33vw, 20vw"
                            priority={plant.id === 1}
                            className="object-cover" 
                            data-ai-hint={plant.hint} />
                    ) : (
                        <Leaf className="w-1/2 h-1/2 text-muted-foreground/40" />
                    )}
                    {plant.hasGlitter && <GlitterAnimation />}
                    {plant.hasRedGlitter && <RedGlitterAnimation />}
                    {plant.hasSheen && <SheenAnimation />}
                    {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                    {plant.form === 'Evolved' && (
                        <div className="absolute top-1 right-1 bg-secondary/80 text-secondary-foreground p-1 rounded-full shadow-md">
                            <Sparkles className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <div className="p-2 text-center bg-white/50">
                    <p className="text-xs font-semibold text-primary truncate">{plant.name}</p>
                </div>

                {isSelected && (
                    <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-primary-foreground animate-in zoom-in-75" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function ProfilePage() {
  const { user, gameData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [plantsCollected, setPlantsCollected] = useState(0);
  const [plantsEvolved, setPlantsEvolved] = useState(0);

  const allPlants = useMemo(() => {
    if (!gameData?.plants) return [];
    return (Object.values(gameData.plants) as Plant[]).sort((a, b) => b.level - a.level);
  }, [gameData]);

  const [selectedPlantIds, setSelectedPlantIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (gameData?.plants) {
        const allPlantsList = Object.values(gameData.plants) as Plant[];
        setPlantsCollected(allPlantsList.length);
        const evolvedCount = allPlantsList.filter(p => p.form !== 'Base').length;
        setPlantsEvolved(evolvedCount);
    }
    if (gameData?.showcasePlantIds) {
        setSelectedPlantIds(gameData.showcasePlantIds);
    }
  }, [gameData]);

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user || !gameData) {
     return (
        <div className="p-4 space-y-6 pb-24">
            <header className="pb-4">
              <h1 className="text-3xl text-primary text-center">My Profile</h1>
            </header>
            <Card className="text-center py-10">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full w-fit p-3 mb-2">
                        <User className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>View Your Profile</CardTitle>
                    <CardDescription>Log in to view your game stats, manage your collection, and set up your community showcase.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/login"><LogIn className="mr-2 h-4 w-4"/>Log In to View Profile</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (e) {
      console.error("Failed to log out", e);
    }
  };
  
  const handleSelectPlant = (plantId: number) => {
    setSelectedPlantIds(prev => {
        if (prev.includes(plantId)) {
            return prev.filter(id => id !== plantId);
        }
        if (prev.length < MAX_SHOWCASE_PLANTS) {
            return [...prev, plantId];
        }
        toast({
            variant: 'destructive',
            title: 'Showcase Full',
            description: `You can only select up to ${MAX_SHOWCASE_PLANTS} plants for your showcase.`,
        });
        return prev;
    });
  };

  const handleSaveShowcase = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
        await updateShowcasePlants(user.uid, selectedPlantIds);
        toast({
            title: 'Showcase Updated!',
            description: 'Your new showcase is now visible on the Community page.',
        });
    } catch (error) {
        console.error("Failed to update showcase", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save your showcase selection.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleShare = () => {
    if (user && navigator.share) {
        const referralLink = `${window.location.origin}/signup?ref=${user.uid}`;
        navigator.share({
            title: 'Join me on Plenty of Plants!',
            text: 'Collect and grow beautiful AI-generated plants with me!',
            url: referralLink,
        }).then(() => {
            toast({ title: 'Link Shared!', description: 'Thank you for sharing the game!' });
        }).catch((error) => {
            console.error('Error sharing:', error);
            // Fallback for when share fails but is supported
            navigator.clipboard.writeText(referralLink);
            toast({ title: 'Link Copied!', description: 'Your referral link has been copied to the clipboard.' });
        });
    } else if (user) {
        const referralLink = `${window.location.origin}/signup?ref=${user.uid}`;
        navigator.clipboard.writeText(referralLink);
        toast({ title: 'Link Copied!', description: 'Your referral link has been copied to the clipboard.' });
    }
  };

  const profileData: ProfileData = {
      username: user.displayName || 'PlantLover',
      email: user.email || 'you@example.com',
      gameId: `#${user.uid.slice(0, 8).toUpperCase()}`,
      gold: gameData?.gold || 0,
      avatarColor: (gameData as any)?.avatarColor || 'hsl(120, 70%, 85%)'
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="pb-4">
        <h1 className="text-3xl text-primary text-center">My Profile</h1>
      </header>

      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src="" alt="User avatar" />
            <AvatarFallback style={{ backgroundColor: profileData.avatarColor }} className="text-4xl font-bold text-primary/70">
              {profileData.username ? profileData.username.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{profileData.username}</CardTitle>
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
           <Separator />
          <InfoRow label="Seed Bag Size" value={gameData?.seedBagSize || 3} valueClassName="text-xs" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Community Showcase</CardTitle>
          <CardDescription>Select up to ${MAX_SHOWCASE_PLANTS} plants to show off to the community. Changes are saved when you press the button below.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {allPlants.map(plant => (
                <ShowcasePlantCard 
                  key={plant.id} 
                  plant={plant} 
                  isSelected={selectedPlantIds.includes(plant.id)}
                  onSelect={() => handleSelectPlant(plant.id)}
                />
              ))}
           </div>
           {allPlants.length === 0 && (
             <p className="text-muted-foreground text-center py-4">You have no plants to showcase yet!</p>
           )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Button onClick={handleSaveShowcase} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Save Showcase Selection'}
        </Button>
        <Button variant="secondary" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share & Expand Seed Bag
        </Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
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
      </div>
    </div>
  );
}
