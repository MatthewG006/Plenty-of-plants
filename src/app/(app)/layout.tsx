
import BottomNavBar from '@/components/bottom-nav-bar';
import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/music-player';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudioProvider>
      <div className="min-h-screen w-full">
        <main className="pb-24">{children}</main>
        <BottomNavBar />
        <MusicPlayer />
      </div>
    </AudioProvider>
  );
}
