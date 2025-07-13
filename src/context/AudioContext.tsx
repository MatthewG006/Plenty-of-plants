
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  sfxVolume: number;
  setSfxVolume: (volume: number) => void;
  playSfx: (sound: 'tap') => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const sfxFiles = {
  tap: '/sfx/tap.mp3',
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.75);
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

  const handleSetSfxVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setSfxVolume(clampedVolume);
  }, []);
  
  const playSfx = useCallback((sound: keyof typeof sfxFiles) => {
    if (sfxVolume > 0) {
      const audio = new Audio(sfxFiles[sound]);
      audio.volume = sfxVolume;
      audio.play().catch(e => console.error("SFX play failed:", e));
    }
  }, [sfxVolume]);

  useEffect(() => {
    if (audioElement && isPlaying) {
        audioElement.play().catch(e => console.log("Autoplay was prevented. Waiting for user interaction."));
    }
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
