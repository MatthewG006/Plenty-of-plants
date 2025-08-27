
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

// The AuthProvider is the core component that manages the logged-in user's state.
// It wraps the entire application and performs two key functions:
// 1. It listens for authentication state changes (login/logout) from Firebase Auth.
// 2. Once a user is logged in, it establishes a real-time listener to that user's
//    document in Firestore to keep their game data synchronized with the client.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | undefined;

    // This is the primary listener from Firebase Authentication.
    // It fires once when the component mounts, and again any time a user logs in or out.
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // The `currentUser` object is either the logged-in user or `null`.
      // This is the first piece of data set to memory (React state).
      setUser(currentUser);

      if (currentUser) {
        // If a user is logged in, we now know their UID.
        // We use that UID to create a reference to their specific document in the 'users' collection.
        const docRef = doc(db, 'users', currentUser.uid);
        
        // This is the second listener. `onSnapshot` subscribes to the user's document.
        // It fires once immediately with the current data, and then again EVERY time that data changes in the database.
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
            
            // The document data is then stored in memory (the `gameData` React state).
            // Because this is a real-time listener, any change on the server (like getting more gold)
            // will automatically be pushed here and update the state.
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
            // This can happen on first signup. Create the user document and then set the game data.
            createUserDocument(currentUser).then(setGameData);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setGameData(null);
          setLoading(false);
        });
      } else {
        // If there is no user, clear the game data from memory.
        setGameData(null);
        setLoading(false);
      }
    });

    // Cleanup: When the component unmounts, these listeners are turned off to prevent memory leaks.
    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []); // The empty dependency array means this useEffect runs only once on mount.

  // This effect handles routing logic based on the user's authentication state.
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

  // The user and their gameData are provided to all child components.
  return (
    <AuthContext.Provider value={{ user, gameData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Any component can use this hook to access the logged-in user's data.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
