
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music, Zap, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/context/AudioContext';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { resetUserGameData } from '@/lib/firestore';


function SettingRow({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 text-primary" />
                <Label htmlFor={label.toLowerCase()} className="text-lg font-semibold text-primary">
                    {label}
                </Label>
            </div>
            {children}
        </div>
    )
}

export default function SettingsPage() {
  const { user, gameData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { isPlaying, togglePlay, volume, setVolume, sfxVolume, setSfxVolume, playSfx } = useAudio();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClearData = async () => {
    if (!user) return;
    try {
        await resetUserGameData(user.uid);
        toast({
          title: "Game Reset",
          description: "Your collection and gold have been cleared.",
        });

    } catch (e) {
        console.error("Failed to clear data from Firestore", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not reset your game data.",
        });
    }
  };

  if (!isClient || !user || !gameData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="p-4">
      <header className="pb-4">
        <h1 className="text-3xl text-primary text-center">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Game Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow icon={Music} label="Sounds">
            <Switch id="sounds" checked={isPlaying} onCheckedChange={togglePlay} aria-label="Toggle music" />
          </SettingRow>
          <SettingRow icon={Zap} label="FX">
            <Switch id="fx" checked={sfxVolume > 0} onCheckedChange={(checked) => setSfxVolume(checked ? 0.75 : 0)} />
          </SettingRow>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Volume</CardTitle>
        </CardHeader>
        <CardContent>
           <SettingRow icon={Music} label="Music">
              <Slider 
                value={[volume * 100]} 
                onValueChange={(value) => setVolume(value[0] / 100)} 
                max={100} 
                step={1} 
                className="w-1/2" 
                aria-label="Music volume"
              />
          </SettingRow>
           <SettingRow icon={Zap} label="Effects">
              <Slider 
                value={[sfxVolume * 100]} 
                onValueChange={(value) => setSfxVolume(value[0] / 100)}
                onValueCommit={() => playSfx('tap')}
                max={100} 
                step={1} 
                className="w-1/2" 
                aria-label="Effects volume"
              />
          </SettingRow>
        </CardContent>
      </Card>
      
    </div>
  );
}
