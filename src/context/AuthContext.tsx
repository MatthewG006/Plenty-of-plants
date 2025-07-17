
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
      
      const isAuthPage = pathname === '/' || pathname === '/signup';
      const isSplashPage = pathname === '/login';

      if (currentUser) {
        // User is logged in.
        // If they are on an auth page (login/signup), redirect them to the splash page.
        if (isAuthPage) {
            router.push('/login');
        }
      } else {
        // User is not logged in.
        // If they are on a protected page, redirect to login page.
        // Allow access to login, signup, and splash (as it's part of the login flow).
        if (!isAuthPage && !isSplashPage) {
            router.push('/');
        }
      }
    });

    return () => unsubscribeAuth();
  }, [pathname, router]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (user) {
        setLoading(true);
        unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) {
                setGameData(doc.data() as GameData);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user game data:", error);
            setLoading(false);
        });
    } else {
        setLoading(false);
        setGameData(null);
    }
    return () => {
        if (unsub) {
            unsub();
        }
    };
  }, [user]);


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
