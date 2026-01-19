
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { GameData } from "@/interfaces/plant";

type AuthContextType = {
  user: User | null;
  gameData: GameData | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  gameData: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // If there's no user, we are definitively NOT loading.
      if (!currentUser) {
        setGameData(null);
        setLoading(false);
      }
      // If there IS a user, the second useEffect will handle the loading state.
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // This effect runs when the user state changes.
    if (user) {
      // User is found, set loading to true while we fetch their game data.
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setGameData(doc.data() as GameData);
        } else {
          setGameData(null);
        }
        // Data is fetched (or confirmed not to exist), so we are done loading.
        setLoading(false);
      }, (error) => {
        console.error("Error fetching game data:", error);
        setGameData(null);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    } else {
      // No user, clear data and set loading to false.
      setGameData(null);
      setLoading(false);
    }
  }, [user]);

  const contextValue = {
    user,
    gameData,
    loading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
