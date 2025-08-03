
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sprout, Users, Store, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/AudioContext';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/room', label: 'Room', icon: Sprout },
  { href: '/shop', label: 'Shop', icon: Store },
  { href: '/community', label: 'Community', icon: Users },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { playSfx } = useAudio();

  const handleNavClick = () => {
    playSfx('tap');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 border-t bg-card/95 backdrop-blur-sm z-10 flex justify-center">
      <div className="grid h-full w-full max-w-md grid-cols-4 items-center">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={handleNavClick}
              className="flex flex-col items-center justify-center gap-1 h-full"
            >
              <div className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                isActive ? 'bg-accent' : 'bg-transparent'
              )}>
                <item.icon className={cn(
                  'h-6 w-6',
                  isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                )} />
              </div>
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-accent-foreground' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
