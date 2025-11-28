'use client';
import { AuthProvider } from '@/context/AuthContext';
import { AudioProvider } from '@/context/AudioContext';
import { ToastProvider } from '@/context/ToastContext';
import { type ReactNode, useEffect } from 'react';

export function ClientSideProviders({ children }: { children: ReactNode }) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered with scope:', registration.scope))
                .catch(error => console.error('Service Worker registration failed:', error));
        }
    }, []);

    return (
        <ToastProvider>
            <AudioProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </AudioProvider>
        </ToastProvider>
    );
}