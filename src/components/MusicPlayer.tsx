
'use client';

import { useState, useRef, useEffect } from 'react';
import { Music, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
     if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('musicVolume');
      return savedVolume !== null ? parseFloat(savedVolume) : 0.2;
    }
    return 0.2;
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    localStorage.setItem('musicVolume', String(volume));
  }, [volume]);
  
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
         // Autoplay is often blocked, we start playing on the first user interaction
         // We attempt to play, but catch the error if it fails.
         audioRef.current.play().then(() => {
            setIsPlaying(true);
         }).catch(() => {
            setIsPlaying(false);
         });
      }
       // Remove the event listener after the first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);


  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const VolumeIcon = () => {
      if (volume === 0) return <VolumeX />;
      if (volume < 0.5) return <Volume1 />;
      return <Volume2 />;
  }

  return (
    <div className="fixed bottom-20 right-2 z-50">
        <audio ref={audioRef} src="/music.mp3" loop />
        <Popover>
            <PopoverTrigger asChild>
                <Button size="icon" variant="secondary" className="rounded-full shadow-lg">
                    <Music className={isPlaying ? 'animate-pulse' : ''} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" side="top" align="end">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">Music Volume</h4>
                    <div className="flex items-center gap-2">
                        <VolumeIcon />
                        <Slider
                            value={[volume * 100]}
                            onValueChange={(value) => setVolume(value[0] / 100)}
                            max={100}
                            step={1}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}
