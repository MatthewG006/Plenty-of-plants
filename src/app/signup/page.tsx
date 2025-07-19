
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createUserDocument } from '@/lib/firestore';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (username.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Invalid Username',
        description: 'Username must be at least 3 characters long.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });
      
      await createUserDocument(user);

      // On successful signup, route to the splash screen.
      router.push('/'); 

    } catch (error: any) {
      console.error("Firebase Signup Error:", error);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.code === 'auth/email-already-in-use' 
            ? 'This email is already in use.' 
            : 'Could not create your account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-splash-gradient p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Join the Fun!</CardTitle>
          <CardDescription>Create an account to start your collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" placeholder="plantlover" required value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
            </div>
            <Button type="submit" className="w-full text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-4">
          <p className="text-xs text-muted-foreground">
            Already have an account?
          </p>
          <Button variant="link" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
