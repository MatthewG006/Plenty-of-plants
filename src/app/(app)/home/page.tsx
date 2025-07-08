import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Sprout, User } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="p-4 space-y-6">
      <header className="pb-4">
        <h1 className="font-headline text-3xl text-primary">Welcome, PlantLover23!</h1>
        <p className="text-muted-foreground">What would you like to do today?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-6 w-6 text-primary" />
              <span>My Room</span>
            </CardTitle>
            <CardDescription>View your plant collection and arrange your room.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/room">Go to Room</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span>Draw a Plant</span>
            </CardTitle>
            <CardDescription>Get a new free plant every day!</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
              <Link href="/app/room">Draw Now</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              <span>My Profile</span>
            </CardTitle>
            <CardDescription>Check your stats and achievements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/profile">View Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
