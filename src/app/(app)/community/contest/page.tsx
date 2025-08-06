
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Crown, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Plant } from '@/interfaces/plant';
import { useAuth } from '@/context/AuthContext';
import { findOrCreateContestSession } from '@/lib/contest-manager';
import { useToast } from '@/hooks/use-toast';

// Placeholder data - in a real implementation, this would come from Firestore.
const placeholderPlants: (Plant | null)[] = [
    { id: 101, name: "Glimmering Glower", image: "/fallback-plants/glowing-mushroom.png", description: "", hint: "glowing mushroom", hasSheen: true, level: 15, xp: 500, form: "Evolved", baseImage: "", lastWatered: [], hasGlitter: false, hasRainbowGlitter: false, hasRedGlitter: false, personality: "Bubbly", chatEnabled: false, conversationHistory: [] },
    { id: 102, name: "Mystic Mangrove", image: "/fallback-plants/bonsai-tree.png", description: "", hint: "bonsai tree", hasGlitter: true, level: 12, xp: 200, form: "Evolved", baseImage: "", lastWatered: [], hasSheen: false, hasRainbowGlitter: false, hasRedGlitter: false, personality: "Wise", chatEnabled: false, conversationHistory: [] },
    { id: 103, name: "Solaris Succulent", image: "/fallback-plants/succulent-1.png", description: "", hint: "succulent", hasRainbowGlitter: true, level: 20, xp: 800, form: "Final", baseImage: "", lastWatered: [], hasSheen: false, hasGlitter: false, hasRedGlitter: false, personality: "Sassy", chatEnabled: false, conversationHistory: [] }
];

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


export default function ContestPage() {
    const { user, gameData } = useAuth();
    const { toast } = useToast();
    const [status, setStatus] = useState<'waiting' | 'finding_session' | 'countdown' | 'voting' | 'finished'>('waiting');
    const [countdown, setCountdown] = useState(5);
    const [winnerId, setWinnerId] = useState<number | null>(null);

    useEffect(() => {
        if (status !== 'countdown' || countdown <= 0) return;
        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        if (countdown === 1) {
            setTimeout(() => setStatus('voting'), 1000);
        }

        return () => clearTimeout(timer);
    }, [status, countdown]);

    const startContest = async () => {
        if (!user || !gameData) return;

        // For now, we'll just use the user's first plant.
        // A real implementation would let the user choose.
        const playerPlant = Object.values(gameData.plants)[0];

        if (!playerPlant) {
            toast({
                variant: 'destructive',
                title: 'No Plant Found',
                description: 'You need at least one plant to enter a contest.',
            });
            return;
        }

        setStatus('finding_session');
        setWinnerId(null);

        try {
            const session = await findOrCreateContestSession(
                user.uid,
                user.displayName || 'Player',
                (gameData as any).avatarColor || '#ffffff',
                playerPlant
            );
            console.log('Joined or created contest session:', session);
            
            // For now, we'll go straight to a mock countdown.
            // A real implementation would listen to Firestore for the session status to change.
            setStatus('countdown');
            setCountdown(5);

        } catch (error) {
            console.error('Error joining contest session:', error);
            toast({
                variant: 'destructive',
                title: 'Error Joining Contest',
                description: 'Could not join a session. Please try again.',
            });
            setStatus('waiting');
        }
    };

    const handleVote = (plantId: number) => {
        if (status !== 'voting') return;
        // In a real app, this would record the vote in Firestore.
        // Here, we'll just declare the winner immediately.
        setStatus('finished');
        setWinnerId(plantId);
    };

  return (
    <div
      className="min-h-screen bg-cover bg-bottom flex flex-col items-center justify-between text-white p-4 relative"
      style={{ backgroundImage: "url('/contest.png')" }}
    >
        <div className="absolute inset-0 bg-black/50" />
      
        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center gap-4 mt-6">
            <div className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm">
                <h1 className="text-4xl font-bold mb-2">Plant Beauty Contest</h1>
                <p className="text-lg">Join a session and vote for the best-looking plant! The winner gets a special prize.</p>
            </div>
            {status === 'waiting' && <Button onClick={startContest}>Join Contest</Button>}
            {status === 'finding_session' && (
                <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Session...
                </Button>
            )}
            {status === 'countdown' && <p className="text-5xl font-bold animate-pulse">{countdown}</p>}
            {status === 'voting' && <p className="text-2xl font-bold">Vote for your favorite plant!</p>}
            {status === 'finished' && <p className="text-2xl font-bold">The winner has been chosen!</p>}
        </div>

        <div className="w-full h-1/2 absolute bottom-0 left-0 flex items-end justify-center pointer-events-none">
            <div className="grid grid-cols-3 gap-8 w-full max-w-3xl mb-[5%]">
                {placeholderPlants.map((plant, index) => {
                    if (!plant) return <div key={index} />;
                    const isWinner = winnerId === plant.id;
                    return (
                        <div key={plant.id} className="relative flex flex-col items-center justify-end">
                            <div className={cn("relative w-32 h-32 sm:w-48 sm:h-48 transition-all duration-500", isWinner && "scale-125")}>
                                {isWinner && <div className="absolute inset-0 bg-yellow-400/50 rounded-full animate-pulse blur-2xl" />}
                                <Image src={plant.image} alt={plant.name} fill className="object-contain" data-ai-hint={plant.hint} />
                                {plant.hasGlitter && <GlitterAnimation />}
                                {plant.hasSheen && <SheenAnimation />}
                                {plant.hasRainbowGlitter && <RainbowGlitterAnimation />}
                            </div>
                            <div className="text-center mt-2 bg-black/50 px-3 py-1 rounded-md">
                                <p className="font-bold text-sm sm:text-base truncate">{plant.name}</p>
                                {isWinner && <Crown className="w-6 h-6 text-yellow-400 mx-auto mt-1" />}
                            </div>
                            {status === 'voting' && (
                                <Button size="sm" className="mt-2 pointer-events-auto" onClick={() => handleVote(plant.id)}>Vote</Button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

         <div className="absolute top-4 left-4 z-10">
            <Button asChild variant="secondary">
                <Link href="/community/park">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Park
                </Link>
            </Button>
        </div>
    </div>
  );
}
