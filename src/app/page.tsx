import Link from 'next/link';
import { PlantLogo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';

export default function SplashPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-app-gradient p-4">
      <div className="flex flex-col items-center justify-center text-center animate-fade-in-up">
        <PlantLogo className="h-24 w-24 text-primary" />
        <h1 className="mt-6 text-5xl font-headline text-primary text-shadow">
          Plenty Of Plants
        </h1>
        <p className="mt-2 text-lg text-foreground/80 font-body">
          Your digital conservatory awaits.
        </p>
        <Button asChild className="mt-12 animate-pulse-subtle" size="lg">
          <Link href="/login" className="font-headline text-xl px-8">Tap to Enter</Link>
        </Button>
      </div>
    </div>
  );
}
