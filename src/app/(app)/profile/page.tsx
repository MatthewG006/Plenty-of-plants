import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';

function InfoRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary">{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <div className="p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-headline text-2xl text-primary">My Profile</h1>
      </header>

      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src="https://placehold.co/100x100.png" alt="User avatar" data-ai-hint="profile picture" />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="font-headline text-2xl">PlantLover23</CardTitle>
          <p className="text-muted-foreground">#GAMEID12345</p>
        </CardHeader>
        <CardContent>
          <Separator className="my-2"/>
          <InfoRow label="Email" value="you@example.com" />
          <Separator />
          <InfoRow label="Plants Collected" value={8} />
          <Separator />
          <InfoRow label="Plants Evolved" value={2} />
        </CardContent>
      </Card>
    </div>
  );
}
