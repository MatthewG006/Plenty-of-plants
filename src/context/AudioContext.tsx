
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';

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

const SFX_POOL_SIZE = 3;

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.75);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const sfxPool = useRef<HTMLAudioElement[]>([]);
  const sfxPoolIndex = useRef(0);
  
  useEffect(() => {
    // Initialize the SFX pool
    sfxPool.current = Array.from({ length: SFX_POOL_SIZE }, () => new Audio());
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioElement) return;
    
    // The play() method returns a promise. We should handle it.
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
      playPromise.then(_ => {
        // Autoplay started!
        setIsPlaying(true);
      }).catch(error => {
        // Autoplay was prevented.
        console.log("Playback prevented by browser. Waiting for user interaction.");
        setIsPlaying(false);
      });
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
    if (sfxVolume > 0 && sfxFiles[sound] && sfxPool.current.length > 0) {
      const audio = sfxPool.current[sfxPoolIndex.current];
      sfxPoolIndex.current = (sfxPoolIndex.current + 1) % SFX_POOL_SIZE;

      audio.src = sfxFiles[sound];
      audio.volume = sfxVolume;
      audio.play().catch(e => console.error("SFX play failed:", e));
    }
  }, [sfxVolume]);

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
