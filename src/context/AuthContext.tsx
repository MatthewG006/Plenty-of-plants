
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GameData } from '@/lib/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  gameData: GameData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // We will handle data fetching and initial loading state separately
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined;

    if (user) {
      unsubFirestore = onSnapshot(doc(db, "users", user.uid), (doc) => {
          if (doc.exists()) {
              setGameData(doc.data() as GameData);
          }
          // Finished loading game data
          setLoading(false); 
      }, (error) => {
          console.error("Error fetching user game data:", error);
          setLoading(false);
      });
    } else {
      // No user, not loading
      setLoading(false);
      setGameData(null);
    }
    
    return () => {
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, [user]);

  useEffect(() => {
    if (loading) return; // Wait until auth check and data loading is complete

    const isAuthPage = pathname === '/' || pathname === '/signup';

    if (user && isAuthPage) {
      // If a logged-in user is on an auth page, send them to the splash screen
      router.push('/login');
    } else if (!user && !isAuthPage) {
      // If a logged-out user is on a protected page, send them to login
      router.push('/');
    }
  }, [user, loading, pathname, router]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
