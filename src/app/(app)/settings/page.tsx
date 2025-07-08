'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music, Zap, Trash2 } from 'lucide-react';
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

const PLANTS_STORAGE_KEY = 'plenty-of-plants-collection';

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleClearData = () => {
    localStorage.removeItem(PLANTS_STORAGE_KEY);
    toast({
      title: "Collection Cleared",
      description: "You can now start a new collection from scratch.",
    });
    router.push('/home');
    router.refresh();
  };


  return (
    <div className="p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-2xl text-primary">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Game Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow icon={Music} label="Sounds">
            <Switch id="sounds" defaultChecked />
          </SettingRow>
          <SettingRow icon={Zap} label="FX">
            <Switch id="fx" defaultChecked />
          </SettingRow>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Volume</CardTitle>
        </CardHeader>
        <CardContent>
           <SettingRow icon={Music} label="Music">
              <Slider defaultValue={[50]} max={100} step={1} className="w-1/2" />
          </SettingRow>
           <SettingRow icon={Zap} label="Effects">
              <Slider defaultValue={[75]} max={100} step={1} className="w-1/2" />
          </SettingRow>
        </CardContent>
      </Card>
      
      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="font-semibold text-primary">Reset Game</p>
              <p className="text-sm text-muted-foreground">This will permanently delete your plant collection.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your entire plant collection and you will have to start over.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData} className="bg-destructive hover:bg-destructive/90">
                    Yes, delete my collection
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
