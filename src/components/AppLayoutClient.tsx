'use client';
import { usePathname } from 'next/navigation';
import BottomNavBar from '@/components/bottom-nav-bar';
import React from 'react';

// These are the routes that should have the main app layout with the bottom nav bar.
const APP_ROUTES = [
    '/home',
    '/room',
    '/garden',
    '/community',
    '/shop',
    '/profile',
    '/settings',
];

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Check if the current path starts with any of the app routes.
    // This handles nested routes like /community/park as well.
    const isAppPage = pathname && APP_ROUTES.some(route => pathname.startsWith(route));

    if (isAppPage) {
        return (
            <div className="relative flex flex-col h-full bg-background">
                <main className="flex-1 overflow-y-auto pb-16">{children}</main>
                <BottomNavBar />
            </div>
        );
    }
    
    // For non-app pages (like /login), just render the children without the nav bar.
    return <>{children}</>;
}
