import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music, Zap } from 'lucide-react';

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
    </div>
  );
}
