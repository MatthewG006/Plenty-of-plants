
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GameData, getUserGameData } from '@/lib/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  gameData: GameData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  gameData: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch game data when user logs in
        const data = await getUserGameData(currentUser.uid);
        setGameData(data);
      } else {
        // Clear game data when user logs out
        setGameData(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (loading) return; // Don't do anything until initial auth check is done

    const unprotectedPaths = ['/', '/login', '/signup'];
    const isProtectedPage = !unprotectedPaths.includes(pathname);

    // If user is not logged in, redirect them to the main page from any protected page
    if (!user && isProtectedPage) {
      router.push('/');
    }
    
    // If user is logged in, redirect them away from the main/login/signup pages
    if (user && !isProtectedPage) {
        if (pathname === '/') {
            router.push('/home');
        } else if (pathname === '/login' || pathname === '/signup') {
            router.push('/home');
        }
    }
  }, [user, loading, pathname, router]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, gameData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
