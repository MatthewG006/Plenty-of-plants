"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app/room', label: 'Room', icon: Home },
  { href: '/app/profile', label: 'Profile', icon: User },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t bg-card/80 backdrop-blur-sm z-10">
      <div className="mx-auto grid h-full max-w-md grid-cols-3 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn(
                "flex flex-col items-center justify-center text-center h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                )}>
              <item.icon className={cn('h-6 w-6 mb-1')} />
              <span className={cn('text-xs font-medium font-headline')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
