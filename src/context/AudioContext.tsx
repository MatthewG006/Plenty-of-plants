
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
  const [sfxVolume, setSfxVolumeState] = useState(0.75);
  const [musicVolume, setMusicVolumeState] = useState(0.2);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicLoaded, setIsMusicLoaded] = useState(false);
  
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = {
    tap: useRef<HTMLAudioElement | null>(null),
    success: useRef<HTMLAudioElement | null>(null),
    reward: useRef<HTMLAudioElement | null>(null),
    chime: useRef<HTMLAudioElement | null>(null),
    watering: useRef<HTMLAudioElement | null>(null),
  };

  useEffect(() => {
    const savedSfxVolume = localStorage.getItem('sfxVolume');
    if (savedSfxVolume !== null) {
      setSfxVolumeState(parseFloat(savedSfxVolume));
    }

    const savedMusicVolume = localStorage.getItem('musicVolume');
    if (savedMusicVolume !== null) {
      setMusicVolumeState(parseFloat(savedMusicVolume));
    }

    musicRef.current = new Audio('https://storage.googleapis.com/plentyofplants-108e8.firebasestorage.app/music/music.mp3');
    musicRef.current.loop = true;
    musicRef.current.oncanplaythrough = () => {
      setIsMusicLoaded(true);
    };

    audioRefs.tap.current = new Audio('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/sfx%2Ftap.mp3?alt=media&token=6dbbd628-0acf-45c5-b780-99432544fd58');
    audioRefs.success.current = new Audio('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/sfx%2Fsuccess.mp3?alt=media&token=f2fd0fb6-312e-49ab-9af2-1208f571429f');
    audioRefs.reward.current = new Audio('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/sfx%2Freward.mp3?alt=media&token=a8568de4-10f2-4592-ad1f-a499f8bbfc7d');
    audioRefs.chime.current = new Audio('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/sfx%2Fchime.mp3?alt=media&token=ce6f19b8-e743-4f32-80d8-78dc551335ec');
    audioRefs.watering.current = new Audio('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/sfx%2Fwatering.mp3?alt=media&token=44a13f8a-303a-4f85-a577-002a7a32e278');

    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
      }
    };
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
    if (musicRef.current && musicRef.current.paused && isMusicLoaded) {
      musicRef.current.play().then(() => {
          setIsMusicPlaying(true);
      }).catch(e => console.error("Music play failed on start:", e));
    }
  }, [isMusicLoaded]);

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
}, [sfxVolume, audioRefs]);

  const contextValue = {
    sfxVolume,
    setSfxVolume,
    musicVolume,
    setMusicVolume,
    isMusicPlaying,
    toggleMusic,
    startMusic,
    playSfx,
  };

  return (
    <AudioContext.Provider value={contextValue}>
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
