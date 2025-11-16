
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';

interface AudioContextType {
  sfxVolume: number;
  setSfxVolume: (volume: number) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  startMusic: () => void;
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

  const [musicVolume, setMusicVolumeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('musicVolume');
      return savedVolume !== null ? parseFloat(savedVolume) : 0.2;
    }
    return 0.2;
  });
  
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const audioRefs = {
    tap: useRef<HTMLAudioElement | null>(null),
    success: useRef<HTMLAudioElement | null>(null),
    reward: useRef<HTMLAudioElement | null>(null),
    chime: useRef<HTMLAudioElement | null>(null),
    watering: useRef<HTMLAudioElement | null>(null),
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize all audio elements once on the client
      musicRef.current = new Audio('/music.mp3');
      musicRef.current.loop = true;

      audioRefs.tap.current = new Audio('/sfx/tap.mp3');
      audioRefs.success.current = new Audio('/sfx/success.mp3');
      audioRefs.reward.current = new Audio('/sfx/reward.mp3');
      audioRefs.chime.current = new Audio('/sfx/chime.mp3');
      audioRefs.watering.current = new Audio('/sfx/watering.mp3');
    }
  }, []);

  useEffect(() => {
    if (musicRef.current) {
        musicRef.current.volume = musicVolume;
    }
    localStorage.setItem('musicVolume', String(musicVolume));
  }, [musicVolume]);

  const setSfxVolume = (volume: number) => {
    setSfxVolumeState(volume);
    localStorage.setItem('sfxVolume', String(volume));
  };
  
  const setMusicVolume = (volume: number) => {
    setMusicVolumeState(volume);
  }

  const startMusic = useCallback(() => {
    if (musicRef.current && musicRef.current.paused) {
      musicRef.current.play().then(() => {
          setIsMusicPlaying(true);
      }).catch(e => console.error("Music play failed on start:", e));
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (musicRef.current) {
      if (isMusicPlaying) {
        musicRef.current.pause();
      } else {
        musicRef.current.play().catch(e => console.error("Music play failed on toggle:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [isMusicPlaying]);

  const playSfx = useCallback((sound: keyof typeof audioRefs) => {
      const audio = audioRefs[sound].current;
      if (audio) {
          audio.volume = sfxVolume;
          audio.currentTime = 0;
          audio.play().catch(e => console.error("SFX play failed", e));
      }
  }, [sfxVolume]);


  return (
    <AudioContext.Provider value={{ sfxVolume, setSfxVolume, musicVolume, setMusicVolume, isMusicPlaying, toggleMusic, startMusic, playSfx }}>
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
