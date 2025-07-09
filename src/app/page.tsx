'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const USER_DATA_STORAGE_KEY = 'plenty-of-plants-user';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUserRaw = localStorage.getItem(USER_DATA_STORAGE_KEY);
    let userData;

    if (storedUserRaw) {
        userData = JSON.parse(storedUserRaw);
        userData.email = email;
    } else {
        userData = {
            username: email.split('@')[0] || 'PlantLover',
            email,
            gameId: `#GAMEID${Math.floor(10000 + Math.random() * 90000)}`
        };
    }
    
    localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(userData));
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-app-gradient p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Log in to tend to your plants.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full font-headline text-lg">
                Login
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
          <Button variant="ghost" asChild>
            <Link href="/login">Skip for testing</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
