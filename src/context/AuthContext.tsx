
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GameData, createUserDocument, NUM_POTS, NUM_GARDEN_PLOTS } from '@/lib/firestore';
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
            
            let likedUsersData = data.likedUsers || {};
            // Backwards compatibility for old array format
            if (Array.isArray(data.likedUsers)) {
                likedUsersData = data.likedUsers.reduce((acc: Record<string, number>, uid: string) => {
                    acc[uid] = 1; // Give old likes a timestamp of 1 to make them permanent but identifiable
                    return acc;
                }, {});
            }

            const loadedGameData: GameData = {
              gold: data.gold || 0,
              plants: data.plants || {},
              collectionPlantIds: data.collectionPlantIds || [],
              deskPlantIds: data.deskPlantIds || Array(NUM_POTS).fill(null),
              gardenPlantIds: data.gardenPlantIds || Array(NUM_GARDEN_PLOTS).fill(null),
              seeds: data.seeds || [],
              draws: data.draws ?? MAX_DRAWS,
              lastDrawRefill: data.lastDrawRefill || Date.now(),
              lastFreeDrawClaimed: data.lastFreeDrawClaimed || 0,
              lastLoginBonusClaimed: data.lastLoginBonusClaimed || 0,
              sprinklerUnlocked: data.sprinklerUnlocked || false,
              glitterCount: data.glitterCount || 0,
              sheenCount: data.sheenCount || 0,
              rainbowGlitterCount: data.rainbowGlitterCount || 0,
              redGlitterCount: data.redGlitterCount || 0,
              showcasePlantIds: data.showcasePlantIds || [],
              challenges: data.challenges || {},
              challengesStartDate: data.challengesStartDate || 0,
              likes: data.likes || 0,
              likedUsers: likedUsersData,
              autoWaterUnlocked: data.autoWaterUnlocked || false,
              autoWaterEnabled: data.autoWaterEnabled || false,
              waterRefillCount: data.waterRefillCount || 0,
              rubyCount: data.rubyCount || 0,
              plantChatTokens: data.plantChatTokens || 0,
            };
            setGameData(loadedGameData);
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
  }, []); // Only runs on mount

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(pathname);
    const isSplashPage = pathname === '/';

    if (!user && !isAuthPage && !isSplashPage) {
      // If not logged in and not on an auth page or splash, redirect to login
      router.push('/login');
    } else if (user && isAuthPage) {
      // If logged in and on an auth page, redirect to home
      router.push('/home');
    }
  }, [user, loading, pathname, router]);


  if (loading && pathname !== '/') {
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
