
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
    let unsubscribeFirestore: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User is logged in, start listening to their data
        const docRef = doc(db, 'users', currentUser.uid);
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
              lastLoginBonusClaimed: data.lastLoginBonusClaimed || 0,
              waterRefills: data.waterRefills || 0,
              glitterCount: data.glitterCount || 0,
              showcasePlantIds: data.showcasePlantIds || [],
              challenges: data.challenges || {},
              challengesStartDate: data.challengesStartDate || 0,
              likes: data.likes || 0,
              likedUsers: data.likedUsers || [],
            });
          } else {
            // This can happen on first signup.
            createUserDocument(currentUser).then(setGameData);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setGameData(null);
          setLoading(false);
        });
      } else {
        // User is logged out
        setGameData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    const publicPages = ['/', '/login', '/signup'];
    const isPublicPage = publicPages.includes(pathname);

    if (!user && !isPublicPage) {
      // If not logged in and trying to access a protected page, redirect
      router.push('/login');
    } else if (user && isPublicPage && pathname !== '/') {
      // If logged in and on a page like /login or /signup, redirect to home
      router.push('/home');
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
