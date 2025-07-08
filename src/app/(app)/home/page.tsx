import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="p-4 space-y-6 bg-background">
      <header className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
        <h1 className="font-headline text-3xl text-chart-2 font-bold">
          Plenty Of Plants
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </Button>
      </header>

      <main className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">Your Latest Collection</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              No plants collected yet. Time to draw one!
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="items-center">
            <CardTitle className="text-xl font-semibold">Free Draws Available</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-chart-3">
                  <Check className="h-8 w-8 text-white" />
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                  <X className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <Button asChild size="lg" className="w-full font-semibold rounded-full mt-2">
              <Link href="/app/room">Draw New Plant</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              New draw available every 12 hours (max 2 slots).
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
