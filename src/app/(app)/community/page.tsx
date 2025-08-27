
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, Leaf, Sparkles, ShieldAlert, Heart, Star, Trees, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCommunityUsers, likeUser, type CommunityUser } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Plant } from '@/interfaces/plant';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/context/AudioContext';
import { cn } from '@/lib/utils';
import { updateLikePlayerProgress } from '@/lib/challenge-manager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Link from 'next/link';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function SheenAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
            <div className="absolute -top-1/2 w-1/12 h-[200%] bg-white/30 animate-sheen" />
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
            {Array.from({ length: 7 }).map((_, i) => (
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

function PlantDetailDialog({ plant, open, onOpenChange }: { plant: Plant | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!plant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center text-primary">{plant.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="w-64 h-64 relative">
            <div className="rounded-lg overflow-hidden border-4 border-primary/50 shadow-lg bg-green-100 flex items-center justify-center h-full">
              {plant.image && plant.image !== 'placeholder' ? (
                <Image src={plant.image} alt={plant.name} width={256} height={256} className="object-cover w-full h-full" data-ai-hint={plant.hint} />
              ) : (
                <Leaf className="w-24 h-24 text-muted-foreground/50" />
              )}
            </div>
            {plant.hasGlitter && <GlitterAnimation />}
            {plant.hasRedGlitter && <RedGlitterAnimation />}
            {plant.hasSheen && <SheenAnimation />}
            {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
          </div>
          <p className="text-muted-foreground text-center mt-2 px-4">{plant.description}</p>
        </div>
        <DialogFooter className="pt-2">
            <DialogClose asChild>
                <Button className="w-full">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ShowcasePlant({ plant, onSelectPlant }: { plant: Plant, onSelectPlant: (plant: Plant) => void }) {
  return (
    <div 
        className="w-full aspect-square relative rounded-md overflow-hidden bg-muted/30 border border-primary/10 cursor-pointer"
        onClick={() => onSelectPlant(plant)}
    >
      {plant.image !== 'placeholder' ? (
        <Image src={plant.image} alt={plant.name} fill className="object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Leaf className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}
       {plant.hasGlitter && <GlitterAnimation />}
       {plant.hasRedGlitter && <RedGlitterAnimation />}
       {plant.hasSheen && <SheenAnimation />}
       {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
       {plant.form === 'Evolved' && (
          <div className="absolute top-1 right-1 bg-secondary/80 text-secondary-foreground p-1 rounded-full shadow-md backdrop-blur-sm">
              <Sparkles className="w-2 h-2" />
          </div>
        )}
    </div>
  )
}


export default function CommunityPage() {
  const { user, gameData } = useAuth();
  const { playSfx } = useAudio();
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [totalGold, setTotalGold] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setPermissionError(false);

    const usersCollectionRef = collection(db, 'users');

    const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
        const communityUsers: CommunityUser[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const allPlants = data.plants || {};
            const showcasePlantIds = data.showcasePlantIds || [];
            
            const showcasePlants = showcasePlantIds
                .map((id: number) => allPlants[id])
                .filter(Boolean);

            communityUsers.push({
                uid: docSnap.id,
                username: data.username || 'Anonymous',
                avatarColor: data.avatarColor || 'hsl(120, 70%, 85%)',
                showcasePlants: showcasePlants,
                likes: data.likes || 0,
                gold: data.gold || 0,
            });
        });
        
        communityUsers.sort((a, b) => b.likes - a.likes);
        setUsers(communityUsers);
        
        const total = communityUsers.reduce((sum, u) => sum + (u.gold || 0), 0);
        setTotalGold(total);
        
        setIsLoading(false);
    }, (error) => {
        console.error("Firestore Snapshot Error:", error);
        if (error.code === 'permission-denied') {
            setPermissionError(true);
        } else {
            toast({
              variant: 'destructive',
              title: 'Failed to load community data',
              description: 'Please try again later.',
            });
        }
        setIsLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [toast]);

  const handleLike = async (likedUser: CommunityUser) => {
    if (!user) return;
    try {
      await likeUser(user.uid, likedUser.uid);
      await updateLikePlayerProgress(user.uid);
      playSfx('chime');
      toast({
        title: "Liked!",
        description: `You gave ${likedUser.username} 5 gold!`,
      });
      // The UI will update automatically via the onSnapshot listener,
      // so optimistic updates are no longer strictly necessary but can make the UI feel faster.
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.uid === likedUser.uid ? { ...u, likes: u.likes + 1, gold: (u.gold || 0) + 5 } : u
        ).sort((a,b) => b.likes - a.likes)
      );
      setTotalGold(prev => prev + 5);
    } catch (e: any) {
        console.error("Failed to like user", e);
        if (e.message) {
            toast({
                variant: 'destructive',
                title: 'Like Error',
                description: e.message,
            });
        }
    }
  }

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    playSfx('tap');
  };

  const handleCloseDialog = () => {
    setSelectedPlant(null);
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex flex-col items-center gap-1 pb-4 text-center">
        <h1 className="text-2xl text-primary">
          Community Showcase
        </h1>
        <p className="text-muted-foreground">See what other players are growing! Like their showcase to give them 5 gold.</p>
        <Button asChild variant="secondary" className="mt-2">
            <Link href="/community/park">
                <Trees className="mr-2 h-4 w-4" />
                Visit the Park
            </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center pt-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : permissionError ? (
        <Card className="text-center py-10 border-destructive">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 rounded-full w-fit p-3 mb-2">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Permissions Error</CardTitle>
                <CardDescription>
                    Your Firestore security rules are preventing you from viewing community data.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                 <p>To fix this, update your Firestore rules to allow authenticated users to read the `users` collection.</p>
                 <p>See the updated instructions in the `DOCUMENTATION.md` file.</p>
            </CardContent>
        </Card>
      ) : (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Game World Stats</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <Users className="text-muted-foreground" />
                        <span className="font-bold">{users.length}</span>
                        <span className="text-muted-foreground">Players</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Coins className="text-yellow-500" />
                        <span className="font-bold">{totalGold}</span>
                        <span className="text-muted-foreground">Total Gold</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
            {users.length > 0 ? (
                users.map((communityUser) => {
                const likedTimestamp = gameData?.likedUsers?.[communityUser.uid];
                const canLikeAgain = !likedTimestamp || (Date.now() - likedTimestamp > 24 * 60 * 60 * 1000);
                const hasLiked = !!likedTimestamp;
                const isSelf = user?.uid === communityUser.uid;

                return (
                <Card key={communityUser.uid} className="shadow-md">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback style={{ backgroundColor: communityUser.avatarColor }} className="text-xl font-bold text-primary/70">
                        {communityUser.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                        <CardTitle className="text-xl">{communityUser.username}</CardTitle>
                        <div className="flex items-center gap-4 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Heart className={cn("w-4 h-4", communityUser.likes > 0 ? "text-red-500 fill-current" : "")} />
                                <span className="text-sm font-medium">{communityUser.likes}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">{communityUser.gold}</span>
                            </div>
                        </div>
                    </div>
                    <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleLike(communityUser)}
                        disabled={!canLikeAgain || isSelf}
                        className={cn(hasLiked && !canLikeAgain && "border-red-500 text-red-500")}
                        >
                        <Heart className={cn("w-5 h-5", hasLiked && !canLikeAgain && "fill-current")} />
                    </Button>
                    </CardHeader>
                    <CardContent>
                    {communityUser.showcasePlants.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {communityUser.showcasePlants.map(plant => (
                            <ShowcasePlant key={plant.id} plant={plant} onSelectPlant={handleSelectPlant} />
                        ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">This user hasn't selected a showcase yet.</p>
                    )}
                    </CardContent>
                </Card>
                )})
            ) : (
                <Card className="text-center py-10">
                <CardHeader>
                    <CardTitle>The Community is Growing!</CardTitle>
                    <CardDescription>No other players found. Be the first to get your friends to join!</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Go to your Profile page to select your showcase plants.</p>
                </CardContent>
                </Card>
            )}
            </div>
        </>
      )}
      <PlantDetailDialog
        plant={selectedPlant}
        open={!!selectedPlant}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}
      />
    </div>
  );
}
