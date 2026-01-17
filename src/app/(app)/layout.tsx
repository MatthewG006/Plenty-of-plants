
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="relative flex flex-col h-full bg-background">
        <main className="flex-1 overflow-y-auto pb-16">{children}</main>
        <BottomNavBar />
      </div>
  );
}
