
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="p-4 bg-white">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-3xl text-chart-2">Community</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-chart-2" />
            <span>Coming Soon!</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Our community features are still growing. Check back later to connect with other plant lovers!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
