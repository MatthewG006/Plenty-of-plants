
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';

interface AudioContextType {
  sfxVolume: number;
  setSfxVolume: (volume: number) => void;
  playSfx: (sound: 'tap' | 'success' | 'reward' | 'chime' | 'watering') => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [sfxVolume, setSfxVolumeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('sfxVolume');
      return savedVolume !== null ? parseFloat(savedVolume) : 0.75;
    }
    return 0.75;
  });

  const audioRefs = {
    tap: useRef<HTMLAudioElement | null>(null),
    success: useRef<HTMLAudioElement | null>(null),
    reward: useRef<HTMLAudioElement | null>(null),
    chime: useRef<HTMLAudioElement | null>(null),
    watering: useRef<HTMLAudioElement | null>(null),
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRefs.tap.current = new Audio('/sfx/tap.mp3');
      audioRefs.success.current = new Audio('/sfx/success.mp3');
      audioRefs.reward.current = new Audio('/sfx/reward.mp3');
      audioRefs.chime.current = new Audio('/sfx/chime.mp3');
      audioRefs.watering.current = new Audio('/sfx/watering.mp3');
    }
  }, []);

  const setSfxVolume = (volume: number) => {
    setSfxVolumeState(volume);
    localStorage.setItem('sfxVolume', String(volume));
  };
  
  const playSfx = useCallback((sound: keyof typeof audioRefs) => {
      const audio = audioRefs[sound].current;
      if (audio) {
          audio.volume = sfxVolume;
          audio.currentTime = 0;
          audio.play().catch(e => console.error("SFX play failed", e));
      }
  }, [sfxVolume, audioRefs]);


  return (
    <AudioContext.Provider value={{ sfxVolume, setSfxVolume, playSfx }}>
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
