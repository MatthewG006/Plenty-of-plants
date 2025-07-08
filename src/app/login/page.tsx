import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-app-gradient p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Log in to tend to your plants.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full font-headline text-lg" asChild>
                <Link href="/app/home">Login</Link>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-4">
          <p className="text-xs text-muted-foreground">
            Don't have an account?
          </p>
          <Button variant="link" asChild>
            <Link href="/signup">Create a new one</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
