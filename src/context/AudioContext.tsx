
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

type SfxType = 'tap' | 'whoosh' | 'chime' | 'success' | 'reward' | 'watering' | 'pickup';

interface AudioContextType {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  sfxVolume: number;
  setSfxVolume: (volume: number) => void;
  playSfx: (sound: SfxType) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const sfxFiles: Record<SfxType, string> = {
  tap: '/sfx/tap.mp3',
  whoosh: '/sfx/whoosh.mp3',
  chime: '/sfx/chime.mp3',
  success: '/sfx/success.mp3',
  reward: '/sfx/reward.mp3',
  watering: '/sfx/watering.mp3',
  pickup: '/sfx/pick-up.mp3',
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.75);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    if (!audioElement) return;
    
    if (audioElement.paused) {
      audioElement.play().catch(e => console.error("Audio play failed:", e));
      setIsPlaying(true);
    } else {
      audioElement.pause();
      setIsPlaying(false);
    }
  }, [audioElement]);


  const handleSetVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioElement) {
      audioElement.volume = clampedVolume;
    }
  }, [audioElement]);

  const handleSetSfxVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setSfxVolume(clampedVolume);
  }, []);
  
  const playSfx = useCallback((sound: SfxType) => {
    if (sfxVolume > 0 && sfxFiles[sound]) {
      const audio = new Audio(sfxFiles[sound]);
      audio.volume = sfxVolume;
      audio.play().catch(e => console.error("SFX play failed:", e));
    }
  }, [sfxVolume]);

  useEffect(() => {
    if (audioElement && isPlaying && audioElement.paused) {
        audioElement.play().catch(e => console.log("Autoplay was prevented. Waiting for user interaction."));
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!audioElement) return;
      if (document.visibilityState === 'hidden') {
        if (isPlaying) {
          audioElement.pause();
        }
      } else {
        if (isPlaying) {
          audioElement.play().catch(e => console.error("Audio play failed:", e));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioElement, isPlaying]);


  return (
    <AudioContext.Provider value={{ 
      isPlaying, 
      volume, 
      togglePlay, 
      setVolume: handleSetVolume, 
      setAudioElement,
      sfxVolume,
      setSfxVolume: handleSetSfxVolume,
      playSfx
    }}>
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

    