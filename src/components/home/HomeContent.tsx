
import ChallengeList from './ChallengeList';
import Draws from './Draws';
import LatestPlant from './LatestPlant';
import GameTips from './GameTips';
import { Separator } from '@/components/ui/separator';

export default function HomeContent() {

  return (
    <>
      <div className="p-4 space-y-6 bg-white pb-20">
        <header className="flex flex-col items-center space-y-2">
          <h1 className="text-3xl text-primary font-bold text-center">
            Plenty Of Plants
          </h1>
        </header>

        <main className="space-y-6">
          <Draws />
          <LatestPlant />
          <Separator />
          <ChallengeList />
          <Separator />
          <GameTips />
        </main>

      </div>
      <footer className="text-center text-xs text-muted-foreground pb-20 bg-white">
        <p>&copy; 2025 Sky Mountain Graphics. All Rights Reserved.</p>
      </footer>
    </>
  );
}
