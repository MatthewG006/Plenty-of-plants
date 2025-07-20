
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GameData, createUserDocument } from '@/lib/firestore';
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
            deskPlantIds: data.deskPlantIds || [null, null, null],
            draws: data.draws ?? MAX_DRAWS,
            lastDrawRefill: data.lastDrawRefill || Date.now(),
            lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
            waterRefills: data.waterRefills || 0,
            showcasePlantIds: data.showcasePlantIds || [],
          });
        } else {
            // This case handles a user that is authenticated but doesn't have a document yet.
            // This can happen on first signup. We create the document and the onSnapshot listener will pick it up.
            createUserDocument(user).then((newGameData) => {
                // Manually setting game data here can bridge the small gap before the listener fires.
                setGameData(newGameData);
            });
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

    const publicPages = ['/', '/login', '/signup'];
    const isPublicPage = publicPages.includes(pathname);

    if (!user && !isPublicPage) {
      // If user is not logged in and not on a public page, redirect to login.
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
