
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    if (!audioElement) return;
    
    setIsPlaying(prevIsPlaying => {
      const shouldPlay = !prevIsPlaying;
      if (shouldPlay) {
        audioElement.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioElement.pause();
      }
      return shouldPlay;
    });
  }, [audioElement]);

  const handleSetVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioElement) {
      audioElement.volume = clampedVolume;
    }
  }, [audioElement]);
  
  return (
    <AudioContext.Provider value={{ isPlaying, volume, togglePlay, setVolume: handleSetVolume, setAudioElement }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
