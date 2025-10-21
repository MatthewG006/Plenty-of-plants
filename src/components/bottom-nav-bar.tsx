
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Users, Store, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/AudioContext';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/room', label: 'Room', icon: LayoutGrid },
  { href: '/garden', label: 'Garden', icon: Sprout },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/shop', label: 'Shop', icon: Store },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { playSfx } = useAudio();

  const handleNavClick = () => {
    playSfx('tap');
  };

  // Adjust base paths for matching
  const adjustedPathname = pathname.startsWith('/app') ? pathname.substring(4) : pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card/95 backdrop-blur-sm z-10 flex justify-center">
      <div className="grid h-full w-full max-w-md grid-cols-5 items-center">
        {navItems.map((item) => {
          const baseItemPath = item.href === '/home' ? '/' : item.href;
          const isActive = adjustedPathname === baseItemPath || (baseItemPath !== '/' && adjustedPathname.startsWith(baseItemPath));
          
          const finalHref = item.href === '/home' ? '/' : item.href;

          return (
            <Link 
              key={item.href} 
              href={finalHref} 
              onClick={handleNavClick}
              className="flex flex-col items-center justify-center gap-1 h-full"
            >
              <item.icon className={cn(
                'h-6 w-6',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
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
