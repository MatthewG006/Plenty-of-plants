
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
      setLoading(false);
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
      }, (error) => {
          console.error("Error fetching user game data:", error);
      });
    } else {
      setGameData(null);
    }
    
    return () => {
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, [user]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/' || pathname === '/signup';
    const isSplashPage = pathname === '/login';
    
    // If user is logged in
    if (user) {
      if (isAuthPage) {
        router.push('/login');
      }
    } 
    // If user is not logged in
    else {
      if (!isAuthPage && !isSplashPage) {
          router.push('/');
      }
    }
  }, [user, loading, pathname, router]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-splash-gradient">
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
