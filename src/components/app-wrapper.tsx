
'use client';

import { AudioProvider } from '@/context/AudioContext';
import MusicPlayer from '@/components/music-player';
import { ReactNode } from 'react';

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <MusicPlayer />
    </AudioProvider>
  );
}
