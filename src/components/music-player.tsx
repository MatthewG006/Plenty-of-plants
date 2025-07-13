
'use client';

import { useAudio } from '@/context/AudioContext';
import { useEffect, useRef } from 'react';

export default function MusicPlayer() {
  const { isPlaying, volume, setAudioElement } = useAudio();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
  }, [setAudioElement]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          // Autoplay was prevented.
          console.log("Playback prevented by browser. User interaction needed.");
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <audio ref={audioRef} loop>
      <source src="/music/background.mp3" type="audio/mpeg" />
      Your browser does not support the audio element.
    </audio>
  );
}
