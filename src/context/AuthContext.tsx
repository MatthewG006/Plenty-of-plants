
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GameData } from '@/lib/firestore';
import { MAX_DRAWS } from '@/lib/draw-manager';
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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setGameData(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | undefined;

    if (user) {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
           setGameData({
            gold: data.gold || 0,
            plants: data.plants || {},
            collectionPlantIds: data.collectionPlantIds || [],
            deskPlantIds: data.deskPlantIds || [],
            draws: data.draws ?? MAX_DRAWS,
            lastDrawRefill: data.lastDrawRefill || Date.now(),
            lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
            waterRefills: data.waterRefills || 0,
          });
        } else {
            setGameData(null); // Let createUserDocument handle new user creation
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore snapshot error:", error);
        setGameData(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    
    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [user]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = ['/login', '/signup'].includes(pathname);
    const isSplashPage = pathname === '/';

    // If user is logged in, they should not be on an auth page. Redirect them.
    if (user && isAuthPage) {
      router.push('/home');
      return;
    }

    // If user is NOT logged in and tries to access a protected page, redirect them.
    if (!user && !isAuthPage && !isSplashPage) {
      router.push('/login');
    }

  }, [user, loading, pathname, router]);
  
  const isProtectedRoute = !['/', '/login', '/signup'].includes(pathname);

  if (loading && isProtectedRoute) {
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
