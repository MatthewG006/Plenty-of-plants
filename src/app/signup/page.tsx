'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const USER_DATA_STORAGE_KEY = 'plenty-of-plants-user';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const userData = {
      username,
      email,
      gameId: `#GAMEID${Math.floor(10000 + Math.random() * 90000)}`
    };
    localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(userData));
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-app-gradient p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Join the Fun!</CardTitle>
          <CardDescription>Create an account to start your collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" placeholder="plantlover" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full font-headline text-lg">
                Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-4">
          <p className="text-xs text-muted-foreground">
            Already have an account?
          </p>
          <Button variant="link" asChild>
            <Link href="/">Log in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
