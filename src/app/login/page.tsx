
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone, Loader2 } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const updateMessages = [
    {
        title: "New Game Update!",
        description: "We've refreshed the UI and added new features. Enjoy!",
    },
    {
        title: "Watering Cans in Shop!",
        description: "Need more water? Buy refills in the shop to help your plants grow faster!",
    },
    {
        title: "Did you know?",
        description: "You can drag plants from your collection onto the pots in your room to display them.",
    },
    {
        title: "Community Coming Soon!",
        description: "Get ready to connect with other plant lovers and show off your collection.",
    }
];

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState(updateMessages[0]);
  
  const { isPlaying, togglePlay } = useAudio();

  useEffect(() => {
    // Select a random update message on component mount
    const randomIndex = Math.floor(Math.random() * updateMessages.length);
    setCurrentUpdate(updateMessages[randomIndex]);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isPlaying) {
      togglePlay();
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On successful login, route directly to home page.
      router.push('/home');
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.code === 'auth/invalid-credential'
          ? "Invalid email or password. Please try again."
          : "An unexpected error occurred. Please try again later.",
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-splash-image bg-splash-gradient p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Log in to tend to your plants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-accent-foreground/20 bg-accent">
            <Megaphone className="h-4 w-4" />
            <AlertTitle className="font-bold text-accent-foreground">{currentUpdate.title}</AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              {currentUpdate.description}
            </AlertDescription>
          </Alert>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-4">
           <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Don't have an account?
            </p>
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/signup">Create a new one</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
