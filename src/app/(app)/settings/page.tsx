'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music, Zap, Trash2, Loader2, Bell, LogIn } from 'lucide-react';
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
import Link from 'next/link';


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
  const { user, gameData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { sfxVolume, setSfxVolume, playSfx, musicVolume, setMusicVolume, isMusicPlaying, toggleMusic } = useAudio();
  const [isClient, setIsClient] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser',
        description: 'Your browser does not support push notifications.',
      });
      return;
    }

    if (enabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        navigator.serviceWorker.ready.then(registration => {
          registration.active?.postMessage('schedule-notifications');
        });
        toast({
          title: 'Notifications Enabled',
          description: 'You will be reminded to play every 6 hours.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Permissions Denied',
          description: 'You need to grant permission to enable notifications.',
        });
      }
    } else {
      setNotificationsEnabled(false);
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage('cancel-notifications');
      });
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive reminders.',
      });
    }
  };

  if (!isClient || loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    return (
        <div className="p-4 flex flex-col min-h-[calc(100vh-4rem)]">
          <header className="pb-4">
            <h1 className="text-3xl text-primary text-center">Settings</h1>
          </header>
          <Card className="text-center py-10">
            <CardHeader>
                <CardTitle>Log In to Manage Settings</CardTitle>
                <CardDescription>Log in to manage your audio settings and notification preferences.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/login"><LogIn className="mr-2 h-4 w-4"/>Log In</Link>
                </Button>
            </CardContent>
        </Card>
        </div>
    )
  }

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-4rem)]">
      <header className="pb-4">
        <h1 className="text-3xl text-primary text-center">Settings</h1>
      </header>

      <div className="flex-grow">
        <Card>
          <CardHeader>
            <CardTitle>Game Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={Music} label="Music">
              <Switch id="music" checked={isMusicPlaying} onCheckedChange={toggleMusic} />
            </SettingRow>
            <SettingRow icon={Zap} label="Effects">
              <Switch id="fx" checked={sfxVolume > 0} onCheckedChange={(checked) => setSfxVolume(checked ? 0.75 : 0)} />
            </SettingRow>
            <SettingRow icon={Bell} label="Reminders">
              <Switch id="reminders" checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} aria-label="Toggle notifications" />
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
                  value={[musicVolume * 100]} 
                  onValueChange={(value) => setMusicVolume(value[0] / 100)}
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

      <footer className="pt-8 pb-16 text-center text-xs text-muted-foreground">
        <p>Developed by Matthew Gonzalez based in Miami, FL</p>
      </footer>
    </div>
  );
}
